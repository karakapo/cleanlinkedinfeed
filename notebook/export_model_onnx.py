#!/usr/bin/env python3
"""
Scikit-learn Logistic Regression modelini ONNX formatına dönüştürür.
Sektör standardı: ONNX.js ile tarayıcıda çalıştırılabilir.
"""
import pickle
import json
import numpy as np
from pathlib import Path
try:
    from skl2onnx import convert_sklearn
    from skl2onnx.common.data_types import FloatTensorType
    from onnxruntime import InferenceSession
except ImportError:
    print("❌ Gerekli kütüphaneler yüklü değil!")
    print("   Lütfen şunu çalıştırın: pip install skl2onnx onnxruntime")
    exit(1)

# Model dosyalarını yükle
# Script'in bulunduğu dizinden bağımsız çalışması için __file__ kullan
script_dir = Path(__file__).parent.resolve()
models_dir = script_dir.parent / 'extension' / 'models'
model_path = models_dir / 'classifier_model.pkl'
metadata_path = models_dir / 'model_metadata.json'

print("📦 Model yükleniyor...")
with open(model_path, 'rb') as f:
    model = pickle.load(f)

# Metadata'yı yükle
with open(metadata_path, 'r') as f:
    metadata = json.load(f)

print(f"✅ Model yüklendi: {metadata['model_name']}")
print(f"   - Embedding dim: {metadata['embedding_dim']}")
print(f"   - Classes: {metadata['classes']}")

# ONNX formatına dönüştür
print("\n🔄 ONNX formatına dönüştürülüyor...")

# Input shape: (batch_size, embedding_dim)
# Embedding dimension: 384
initial_type = [('float_input', FloatTensorType([None, metadata['embedding_dim']]))]

try:
    onnx_model = convert_sklearn(
        model,
        initial_types=initial_type,
        target_opset=13  # ONNX opset version
    )
    
    # ONNX modelini kaydet
    onnx_path = models_dir / 'classifier_model.onnx'
    with open(onnx_path, 'wb') as f:
        f.write(onnx_model.SerializeToString())
    
    print(f"✅ ONNX model kaydedildi: {onnx_path}")
    print(f"   - Model boyutu: {onnx_path.stat().st_size / 1024:.2f} KB")
    
    # Test: ONNX modelini yükle ve test et
    print("\n🧪 ONNX model test ediliyor...")
    session = InferenceSession(str(onnx_path))
    
    # Test input (384 boyutlu embedding)
    test_input = np.random.rand(1, metadata['embedding_dim']).astype(np.float32)
    outputs = session.run(None, {'float_input': test_input})
    
    print(f"✅ ONNX model çalışıyor!")
    print(f"   - Input shape: {test_input.shape}")
    print(f"   - Output shape: {outputs[0].shape}")
    print(f"   - Predicted class index: {outputs[0].argmax()}")
    
    # Metadata'yı güncelle
    metadata['onnx_model_path'] = 'classifier_model.onnx'
    metadata['input_name'] = 'float_input'
    metadata['input_shape'] = [None, metadata['embedding_dim']]
    
    with open(metadata_path, 'w') as f:
        json.dump(metadata, f, indent=2)
    
    print(f"\n📄 Metadata güncellendi: {metadata_path}")
    
except Exception as e:
    print(f"❌ Hata: {e}")
    print("\n💡 Alternatif: JSON parametreleri kullanılabilir (export_model.py)")
    exit(1)

print("\n✅ Tamamlandı! ONNX modeli extension'da kullanılabilir.")

