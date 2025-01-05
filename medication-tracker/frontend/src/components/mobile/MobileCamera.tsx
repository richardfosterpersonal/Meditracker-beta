import React, { useRef, useState, useCallback } from 'react';
import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  Typography,
  useTheme,
} from '@mui/material';
import {
  Camera as CameraIcon,
  Cameraswitch as CameraswitchIcon,
  PhotoLibrary as PhotoLibraryIcon,
} from '@mui/icons-material';

interface MobileCameraProps {
  onCapture: (image: string) => void;
  onError?: (error: Error) => void;
}

export const MobileCamera: React.FC<MobileCameraProps> = ({ onCapture, onError }) => {
  const theme = useTheme();
  const videoRef = useRef<HTMLVideoElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('environment');
  const [open, setOpen] = useState(false);

  const startCamera = useCallback(async () => {
    try {
      const constraints = {
        video: {
          facingMode,
          width: { ideal: 1920 },
          height: { ideal: 1080 },
        },
      };

      const mediaStream = await navigator.mediaDevices.getUserMedia(constraints);
      setStream(mediaStream);

      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }
    } catch (error) {
      console.error('Error accessing camera:', error);
      onError?.(error as Error);
    }
  }, [facingMode, onError]);

  const stopCamera = useCallback(() => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
  }, [stream]);

  const handleOpen = () => {
    setOpen(true);
    startCamera();
  };

  const handleClose = () => {
    setOpen(false);
    stopCamera();
  };

  const switchCamera = () => {
    stopCamera();
    setFacingMode(prev => (prev === 'user' ? 'environment' : 'user'));
    startCamera();
  };

  const captureImage = () => {
    if (videoRef.current) {
      const canvas = document.createElement('canvas');
      canvas.width = videoRef.current.videoWidth;
      canvas.height = videoRef.current.videoHeight;
      
      const context = canvas.getContext('2d');
      if (context) {
        context.drawImage(videoRef.current, 0, 0);
        const imageData = canvas.toDataURL('image/jpeg');
        onCapture(imageData);
        handleClose();
      }
    }
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        onCapture(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <>
      <Box sx={{ display: 'flex', gap: 1 }}>
        <Button
          variant="contained"
          startIcon={<CameraIcon />}
          onClick={handleOpen}
          sx={{ flex: 1 }}
        >
          Take Photo
        </Button>
        <Button
          variant="outlined"
          component="label"
          startIcon={<PhotoLibraryIcon />}
          sx={{ flex: 1 }}
        >
          Upload Photo
          <input
            type="file"
            accept="image/*"
            hidden
            onChange={handleFileUpload}
          />
        </Button>
      </Box>

      <Dialog
        open={open}
        onClose={handleClose}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography>Take Photo</Typography>
            <IconButton onClick={switchCamera} size="small">
              <CameraswitchIcon />
            </IconButton>
          </Box>
        </DialogTitle>
        <DialogContent>
          <Box
            sx={{
              position: 'relative',
              width: '100%',
              paddingTop: '75%', // 4:3 Aspect Ratio
              bgcolor: 'black',
            }}
          >
            <video
              ref={videoRef}
              autoPlay
              playsInline
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                height: '100%',
                objectFit: 'cover',
              }}
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleClose}>Cancel</Button>
          <Button
            variant="contained"
            onClick={captureImage}
            startIcon={<CameraIcon />}
          >
            Capture
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};
