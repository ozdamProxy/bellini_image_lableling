export type Label = 'pass' | 'faulty' | 'maybe' | 'unlabeled';

export interface ImageData {
  id: string;
  filename: string;
  label: Label;
  path: string;
  s3_key: string;
  s3_bucket: string;
  is_trained: boolean;
  trained_at?: string;
  labeled_at?: string;
  created_at: string;
  updated_at: string;
  claimed_by?: string;
  claimed_at?: string;
  claim_expires_at?: string;
}

export interface LabelRequest {
  filename: string;
  label: Label;
}

export interface MarkTrainedRequest {
  filenames: string[];
}

export interface ImagesResponse {
  images: ImageData[];
  total: number;
  stats?: ImageStats;
}

export interface ImageStats {
  total_images: number;
  available_unlabeled_count: number;
  claimed_count: number;
  unlabeled_count: number;
  pass_count: number;
  faulty_count: number;
  maybe_count: number;
  trained_count: number;
  labeled_untrained_count: number;
  active_labelers_count: number;
}

export interface ClaimRequest {
  userId: string;
  batchSize?: number;
}

export interface ClaimResponse {
  images: ImageData[];
  claimed: number;
}
