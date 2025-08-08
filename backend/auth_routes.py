# Routes d'authentification pour EasyGeo
from datetime import timedelta
from fastapi import APIRouter, HTTPException, status, Depends
from fastapi.security import OAuth2PasswordRequestForm
from auth import (
    UserCreate, UserLogin, Token, User,
    create_user, authenticate_user, create_access_token,
    get_current_user, ACCESS_TOKEN_EXPIRE_MINUTES,
    users_collection
)

auth_router = APIRouter(prefix="/api/auth", tags=["Authentication"])

@auth_router.post("/register", response_model=Token)
async def register(user_data: UserCreate):
    """Inscription d'un nouvel utilisateur"""
    try:
        # Créer l'utilisateur
        user = await create_user(user_data)
        
        # Créer le token d'accès
        access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
        access_token = create_access_token(
            data={"sub": user["id"]},
            expires_delta=access_token_expires
        )
        
        # Convertir en modèle User
        user_obj = User(
            id=user["id"],
            email=user["email"],
            first_name=user["first_name"],
            last_name=user["last_name"],
            is_premium=user["is_premium"],
            subscription_type=user["subscription_type"],
            subscription_expires=user.get("subscription_expires"),
            created_at=user["created_at"],
            last_login=user.get("last_login"),
            is_active=user["is_active"]
        )
        
        return {
            "access_token": access_token,
            "token_type": "bearer",
            "user": user_obj
        }
        
    except HTTPException as e:
        raise e
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Erreur lors de l'inscription: {str(e)}"
        )

@auth_router.post("/login", response_model=Token)
async def login(user_data: UserLogin):
    """Connexion d'un utilisateur"""
    user = await authenticate_user(user_data.email, user_data.password)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Email ou mot de passe incorrect",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    # Créer le token d'accès
    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": user["id"]},
        expires_delta=access_token_expires
    )
    
    # Convertir en modèle User
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
    
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user": user_obj
    }

@auth_router.get("/me", response_model=User)
async def get_current_user_info(current_user: User = Depends(get_current_user)):
    """Récupérer les informations de l'utilisateur connecté"""
    return current_user

@auth_router.post("/logout")
async def logout():
    """Déconnexion (côté client, invalider le token)"""
    return {"message": "Déconnexion réussie"}

# Route pour mettre à jour le profil utilisateur
@auth_router.put("/profile", response_model=User)
async def update_profile(
    first_name: str = None,
    last_name: str = None,
    current_user: User = Depends(get_current_user)
):
    """Mettre à jour le profil utilisateur"""
    update_data = {}
    
    if first_name:
        update_data["first_name"] = first_name
    if last_name:
        update_data["last_name"] = last_name
        
    if update_data:
        await users_collection.update_one(
            {"id": current_user.id},
            {"$set": update_data}
        )
        
        # Récupérer l'utilisateur mis à jour
        updated_user = await users_collection.find_one({"id": current_user.id})
        
        return User(
            id=updated_user["id"],
            email=updated_user["email"],
            first_name=updated_user["first_name"],
            last_name=updated_user["last_name"],
            is_premium=updated_user.get("is_premium", False),
            subscription_type=updated_user.get("subscription_type", "free"),
            subscription_expires=updated_user.get("subscription_expires"),
            created_at=updated_user["created_at"],
            last_login=updated_user.get("last_login"),
            is_active=updated_user.get("is_active", True)
        )
    
    return current_user

# Route pour simuler un upgrade vers premium (pour les tests)
@auth_router.post("/upgrade-premium")
async def upgrade_to_premium(current_user: User = Depends(get_current_user)):
    """Upgrade vers premium (simulation pour tests)"""
    from datetime import datetime, timedelta
    
    # Mettre à jour l'utilisateur vers premium (1 an)
    await users_collection.update_one(
        {"id": current_user.id},
        {"$set": {
            "is_premium": True,
            "subscription_type": "premium",
            "subscription_expires": datetime.utcnow() + timedelta(days=365)
        }}
    )
    
    return {"message": "Upgrade vers premium réussi !"}

# Route pour obtenir les statistiques utilisateur
@auth_router.get("/stats")
async def get_user_stats():
    """Statistiques des utilisateurs (admin)"""
    total_users = await users_collection.count_documents({})
    premium_users = await users_collection.count_documents({"is_premium": True})
    free_users = total_users - premium_users
    
    return {
        "total_users": total_users,
        "premium_users": premium_users,
        "free_users": free_users,
        "premium_percentage": (premium_users / total_users * 100) if total_users > 0 else 0
    }