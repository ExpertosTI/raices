import React, { useState, useCallback } from 'react';
import Cropper from 'react-easy-crop';
import { getCroppedImg } from '../utils/cropImage'; // Helper function we will create
import { X, Check } from 'lucide-react';
import './ImageCropper.css';

interface Props {
    imageSrc: string;
    onCropComplete: (file: Blob) => void;
    onCancel: () => void;
}

export const ImageCropper: React.FC<Props> = ({ imageSrc, onCropComplete, onCancel }) => {
    const [crop, setCrop] = useState({ x: 0, y: 0 });
    const [zoom, setZoom] = useState(1);
    const [croppedAreaPixels, setCroppedAreaPixels] = useState<any>(null);

    const onCropChange = (crop: { x: number; y: number }) => {
        setCrop(crop);
    };

    const onCropCompleteCallback = useCallback((_croppedArea: any, croppedAreaPixels: any) => {
        setCroppedAreaPixels(croppedAreaPixels);
    }, []);

    const showCroppedImage = async () => {
        try {
            const croppedImageBlob = await getCroppedImg(imageSrc, croppedAreaPixels);
            if (croppedImageBlob) {
                onCropComplete(croppedImageBlob);
            }
        } catch (e) {
            console.error(e);
        }
    };

    return (
        <div className="cropper-overlay">
            <div className="cropper-container">
                <div className="cropper-header">
                    <h3>Recortar Imagen</h3>
                    <button className="close-btn" onClick={onCancel}><X /></button>
                </div>
                <div className="cropper-area">
                    <Cropper
                        image={imageSrc}
                        crop={crop}
                        zoom={zoom}
                        aspect={1}
                        onCropChange={onCropChange}
                        onCropComplete={onCropCompleteCallback}
                        onZoomChange={setZoom}
                        classes={{ containerClassName: 'crop-container' }}
                    />
                </div>
                <div className="cropper-controls">
                    <input
                        type="range"
                        value={zoom}
                        min={1}
                        max={3}
                        step={0.1}
                        aria-labelledby="Zoom"
                        onChange={(e) => setZoom(Number(e.target.value))}
                        className="zoom-range"
                    />
                    <div className="cropper-actions">
                        <button className="btn-cancel" onClick={onCancel}>Cancelar</button>
                        <button className="btn-save" onClick={showCroppedImage}>
                            <Check size={18} /> Guardar
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};
