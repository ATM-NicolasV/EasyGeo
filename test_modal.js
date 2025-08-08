// Test simple de la fonctionnalité modal
console.log("🧪 Test de la modal des articles par source");

// Simuler un clic sur une pastille
const testModalFunctionality = async () => {
  try {
    // Tester l'endpoint backend
    const response = await fetch('https://b0afb364-8222-42b5-ae52-36212defd8ac.preview.emergentagent.com/api/admin/articles/by-source?source=Le%20Monde&limit=3');
    const data = await response.json();
    
    if (data.articles && data.articles.length > 0) {
      console.log(`✅ API fonctionne: ${data.articles.length} articles récupérés pour ${data.source}`);
      console.log(`📰 Premier article: ${data.articles[0].title}`);
      console.log(`🔗 URL: ${data.articles[0].url}`);
      console.log(`📅 Date: ${data.articles[0].scraped_at}`);
    } else {
      console.log("❌ Aucun article trouvé");
    }
    
    return true;
  } catch (error) {
    console.error("❌ Erreur:", error);
    return false;
  }
};

// Lancer le test
testModalFunctionality();
