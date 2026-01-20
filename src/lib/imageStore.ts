import { ImageData, Label } from '@/types/image';
import fs from 'fs';
import path from 'path';

const DATA_FILE = path.join(process.cwd(), 'data', 'images.json');

export interface ImageStore {
  images: Record<string, ImageData>;
}

function ensureDataDirectory() {
  const dataDir = path.join(process.cwd(), 'data');
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }
}

function readStore(): ImageStore {
  ensureDataDirectory();

  if (!fs.existsSync(DATA_FILE)) {
    return { images: {} };
  }

  try {
    const data = fs.readFileSync(DATA_FILE, 'utf-8');
    return JSON.parse(data);
  } catch (error) {
    console.error('Error reading image store:', error);
    return { images: {} };
  }
}

function writeStore(store: ImageStore) {
  ensureDataDirectory();

  try {
    fs.writeFileSync(DATA_FILE, JSON.stringify(store, null, 2));
  } catch (error) {
    console.error('Error writing image store:', error);
    throw error;
  }
}

export function getAllImages(): ImageData[] {
  const store = readStore();
  const publicDir = path.join(process.cwd(), 'public', 'images');

  const allFiles: Set<string> = new Set();

  const folders = ['unlabeled', 'pass', 'faulty', 'maybe'];
  folders.forEach(folder => {
    const folderPath = path.join(publicDir, folder);
    if (fs.existsSync(folderPath)) {
      const files = fs.readdirSync(folderPath);
      files.forEach(file => {
        if (file.match(/\.(jpg|jpeg|png|gif|webp)$/i)) {
          allFiles.add(file);
        }
      });
    }
  });

  const images: ImageData[] = [];

  allFiles.forEach(filename => {
    if (store.images[filename]) {
      images.push(store.images[filename]);
    } else {
      const newImage: ImageData = {
        id: filename,
        filename,
        label: 'unlabeled',
        path: `/images/unlabeled/${filename}`,
        s3_key: '',
        s3_bucket: '',
        is_trained: false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      images.push(newImage);
      store.images[filename] = newImage;
    }
  });

  writeStore(store);

  return images.sort((a, b) => a.filename.localeCompare(b.filename));
}

export function getImagesByLabel(label?: Label): ImageData[] {
  const allImages = getAllImages();

  if (!label) {
    return allImages;
  }

  return allImages.filter(img => img.label === label);
}

export function labelImage(filename: string, label: Label): ImageData | null {
  const store = readStore();

  if (!store.images[filename]) {
    const allImages = getAllImages();
    const image = allImages.find(img => img.filename === filename);

    if (!image) {
      return null;
    }
  }

  const currentLabel = store.images[filename]?.label || 'unlabeled';

  const publicDir = path.join(process.cwd(), 'public', 'images');
  const oldPath = path.join(publicDir, currentLabel, filename);
  const newPath = path.join(publicDir, label, filename);

  if (fs.existsSync(oldPath)) {
    const newDir = path.join(publicDir, label);
    if (!fs.existsSync(newDir)) {
      fs.mkdirSync(newDir, { recursive: true });
    }

    fs.renameSync(oldPath, newPath);
  }

  const updatedImage: ImageData = {
    id: filename,
    filename,
    label,
    path: `/images/${label}/${filename}`,
    s3_key: '',
    s3_bucket: '',
    is_trained: false,
    labeled_at: new Date().toISOString(),
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  store.images[filename] = updatedImage;
  writeStore(store);

  return updatedImage;
}
