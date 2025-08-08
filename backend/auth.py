# Système d'authentification JWT pour EasyGeo
import os
import uuid
from datetime import datetime, timedelta
from typing import Optional, Dict, Any
from passlib.context import CryptContext
from jose import JWTError, jwt
from fastapi import HTTPException, status, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from motor.motor_asyncio import AsyncIOMotorClient
from pydantic import BaseModel, EmailStr
from dotenv import load_dotenv

load_dotenv()

# Configuration JWT
SECRET_KEY = os.environ.get("JWT_SECRET_KEY", "your-secret-key-change-in-production")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 30 * 24 * 60  # 30 jours

# Context de hashage des mots de passe
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# Security scheme pour les tokens
security = HTTPBearer()

# Connexion MongoDB
mongo_client = AsyncIOMotorClient(os.environ.get('MONGO_URL'))
db = mongo_client[os.environ.get('DB_NAME', 'political_analyzer')]
users_collection = db.users

# Modèles Pydantic
class UserBase(BaseModel):
    email: EmailStr
    first_name: str
    last_name: str

class UserCreate(UserBase):
    password: str

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class User(UserBase):
    id: str
    is_premium: bool = False
    subscription_type: str = "free"  # "free", "premium"
    subscription_expires: Optional[datetime] = None
    created_at: datetime
    last_login: Optional[datetime] = None
    is_active: bool = True

class Token(BaseModel):
    access_token: str
    token_type: str
    user: User

# Fonctions utilitaires
def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Vérifier un mot de passe"""
    return pwd_context.verify(plain_password, hashed_password)

def get_password_hash(password: str) -> str:
    """Hasher un mot de passe"""
    return pwd_context.hash(password)

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    """Créer un token JWT"""
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

async def get_user_by_email(email: str) -> Optional[Dict[str, Any]]:
    """Récupérer un utilisateur par email"""
    user = await users_collection.find_one({"email": email})
    return user

async def create_user(user_data: UserCreate) -> Dict[str, Any]:
    """Créer un nouvel utilisateur"""
    # Vérifier si l'utilisateur existe déjà
    existing_user = await get_user_by_email(user_data.email)
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Un utilisateur avec cet email existe déjà"
        )
    
    # Créer l'utilisateur
    hashed_password = get_password_hash(user_data.password)
    user_dict = {
        "id": str(uuid.uuid4()),
        "email": user_data.email,
        "first_name": user_data.first_name,
        "last_name": user_data.last_name,
        "hashed_password": hashed_password,
        "is_premium": False,
        "subscription_type": "free",
        "subscription_expires": None,
        "created_at": datetime.utcnow(),
        "last_login": None,
        "is_active": True
    }
    
    await users_collection.insert_one(user_dict)
    
    # Retourner l'utilisateur sans le mot de passe
    del user_dict["hashed_password"]
    return user_dict

async def authenticate_user(email: str, password: str) -> Optional[Dict[str, Any]]:
    """Authentifier un utilisateur"""
    user = await get_user_by_email(email)
    if not user:
        return None
    if not verify_password(password, user["hashed_password"]):
        return None
    
    # Mettre à jour la dernière connexion
    await users_collection.update_one(
        {"id": user["id"]},
        {"$set": {"last_login": datetime.utcnow()}}
    )
    
    return user

async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)) -> User:
    """Récupérer l'utilisateur actuel à partir du token"""
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Impossible de valider les identifiants",
        headers={"WWW-Authenticate": "Bearer"},
    )
    
    try:
        payload = jwt.decode(credentials.credentials, SECRET_KEY, algorithms=[ALGORITHM])
        user_id: str = payload.get("sub")
        if user_id is None:
            raise credentials_exception
    except JWTError:
        raise credentials_exception
    
    user = await users_collection.find_one({"id": user_id})
    if user is None:
        raise credentials_exception
    
    # Convertir en modèle Pydantic
    user_obj = User(
        id=user["id"],
        email=user["email"],
        first_name=user["first_name"],
        last_name=user["last_name"],
        is_premium=user.get("is_premium", False),
        subscription_type=user.get("subscription_type", "free"),
        subscription_expires=user.get("subscription_expires"),
        created_at=user["created_at"],
        last_login=user.get("last_login"),
        is_active=user.get("is_active", True)
    )
    
    return user_obj

from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from typing import Optional

security_optional = HTTPBearer(auto_error=False)

async def get_optional_current_user(credentials: Optional[HTTPAuthorizationCredentials] = Depends(security_optional)) -> Optional[User]:
    """Récupérer l'utilisateur actuel (optionnel) - pour les endpoints publics avec contenu limité"""
    if not credentials:
        return None
    
    try:
        return await get_current_user(credentials)
    except HTTPException:
        return None

def require_premium(current_user: User = Depends(get_current_user)) -> User:
    """Dépendance qui nécessite un abonnement premium"""
    if not current_user.is_premium:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Un abonnement premium est requis pour accéder à cette fonctionnalité"
        )
    return current_user

def is_premium_user(user: Optional[User]) -> bool:
    """Vérifier si l'utilisateur a un abonnement premium valide"""
    if not user:
        return False
    
    if user.subscription_type == "premium":
        # Vérifier si l'abonnement n'a pas expiré
        if user.subscription_expires is None or user.subscription_expires > datetime.utcnow():
            return True
    
    return False