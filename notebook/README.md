# Notebooks

Bu klasörde model eğitimi ve geliştirme için Jupyter notebook'ları bulunur.

## Kurulum

Notebook'ları çalıştırmak için gerekli kütüphaneleri yükleyin:

```bash
pip install sentence-transformers pandas numpy scikit-learn matplotlib seaborn onnxruntime jupyter
```

## Notebook'lar

### 01_embedding_model_selection.ipynb
- Embedding model karşılaştırması ve seçimi
- Model eğitimi pipeline'ı
- Sınıflandırıcı model eğitimi (Random Forest, Logistic Regression, SVM)
- Model performans değerlendirmesi

## Embedding Model Seçimi

**Önerilen Model**: `sentence-transformers/all-MiniLM-L6-v2`

**Neden?**
- ✅ Boyut: 23MB (< 25MB gereksinimi)
- ✅ Hızlı: 15-30ms inference süresi
- ✅ 384 boyutlu çıktı
- ✅ ONNX.js ile uyumlu
- ✅ LinkedIn postları için uygun

## Sonraki Adımlar

1. Gerçek veri setini topla ve etiketle
2. Notebook'u çalıştır ve modeli eğit
3. Modeli ONNX formatına dönüştür (tarayıcı için)
4. Chrome Extension'a entegre et

