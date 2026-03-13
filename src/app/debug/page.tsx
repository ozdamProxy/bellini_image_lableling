'use client';

import { useEffect, useState } from 'react';

interface DebugInfo {
  envVars: {
    AWS_REGION: boolean;
    AWS_ACCESS_KEY_ID: boolean;
    AWS_SECRET_ACCESS_KEY: boolean;
    AWS_S3_BUCKET: boolean;
    bucketName: string;
  };
  s3Test: {
    success: boolean;
    error: string | null;
    imageCount: number;
    sampleImageUrl: string | null;
  };
  images?: {
    filename: string;
    path: string;
    s3_key: string;
  }[];
}

export default function DebugPage() {
  const [debugInfo, setDebugInfo] = useState<DebugInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchDebugInfo = async () => {
      try {
        setLoading(true);
        const response = await fetch('/api/debug/s3-test');
        const data = await response.json();
        setDebugInfo(data);

        // Also fetch actual images to see their URLs
        const imagesResponse = await fetch('/api/images?limit=3');
        const imagesData = await imagesResponse.json();
        setDebugInfo((prev) => ({
          ...data,
          images: imagesData.images?.slice(0, 3) || [],
        }));
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setLoading(false);
      }
    };

    fetchDebugInfo();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 p-8">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-2xl font-bold mb-4">Debug Page</h1>
          <div className="bg-white rounded-lg shadow p-4">
            <p className="text-gray-600">Loading debug information...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-100 p-8">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-2xl font-bold mb-4 text-red-600">Debug Error</h1>
          <div className="bg-white rounded-lg shadow p-4">
            <p className="text-red-600">{error}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 p-8">
      <div className="max-w-4xl mx-auto space-y-6">
        <h1 className="text-3xl font-bold">🔍 S3 Image Debugging</h1>

        {/* Environment Variables */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-4">Environment Variables</h2>
          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="font-medium">AWS_REGION:</span>
              <span className={debugInfo?.envVars.AWS_REGION ? 'text-green-600' : 'text-red-600'}>
                {debugInfo?.envVars.AWS_REGION ? '✅ Set' : '❌ Missing'}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="font-medium">AWS_ACCESS_KEY_ID:</span>
              <span className={debugInfo?.envVars.AWS_ACCESS_KEY_ID ? 'text-green-600' : 'text-red-600'}>
                {debugInfo?.envVars.AWS_ACCESS_KEY_ID ? '✅ Set' : '❌ Missing'}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="font-medium">AWS_SECRET_ACCESS_KEY:</span>
              <span className={debugInfo?.envVars.AWS_SECRET_ACCESS_KEY ? 'text-green-600' : 'text-red-600'}>
                {debugInfo?.envVars.AWS_SECRET_ACCESS_KEY ? '✅ Set' : '❌ Missing'}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="font-medium">AWS_S3_BUCKET:</span>
              <span className={debugInfo?.envVars.AWS_S3_BUCKET ? 'text-green-600' : 'text-red-600'}>
                {debugInfo?.envVars.AWS_S3_BUCKET ? `✅ ${debugInfo.envVars.bucketName}` : '❌ Missing'}
              </span>
            </div>
          </div>
        </div>

        {/* S3 Test */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-4">S3 Connection Test</h2>
          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="font-medium">Connection Status:</span>
              <span className={debugInfo?.s3Test.success ? 'text-green-600' : 'text-red-600'}>
                {debugInfo?.s3Test.success ? '✅ Success' : '❌ Failed'}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="font-medium">Images Found:</span>
              <span className="font-semibold">{debugInfo?.s3Test.imageCount || 0}</span>
            </div>
            {debugInfo?.s3Test.error && (
              <div className="mt-2 p-2 bg-red-50 rounded">
                <p className="text-sm text-red-600 font-medium">Error:</p>
                <p className="text-sm text-red-800">{debugInfo.s3Test.error}</p>
              </div>
            )}
          </div>
        </div>

        {/* Sample Images */}
        {debugInfo?.images && debugInfo.images.length > 0 && (
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold mb-4">Sample Images (First 3)</h2>
            <div className="space-y-4">
              {debugInfo.images.map((image, index) => (
                <div key={index} className="border rounded-lg p-4">
                  <p className="font-medium text-sm mb-2">{image.filename}</p>
                  <p className="text-xs text-gray-600 mb-2 break-all">
                    S3 Key: {image.s3_key}
                  </p>
                  <p className="text-xs text-gray-600 mb-3 break-all">
                    URL: {image.path}
                  </p>
                  <div className="space-y-2">
                    <img
                      src={image.path}
                      alt={image.filename}
                      className="max-w-xs border rounded"
                      onError={(e) => {
                        e.currentTarget.src = 'data:image/svg+xml,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="200" height="100"><rect fill="%23f00" width="200" height="100"/><text fill="%23fff" x="10" y="50" font-size="14">Failed to load</text></svg>');
                      }}
                    />
                    <a
                      href={image.path}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block text-sm text-blue-600 hover:underline"
                    >
                      Open image in new tab →
                    </a>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Manual Test Link */}
        <div className="bg-blue-50 rounded-lg p-6">
          <h2 className="text-xl font-semibold mb-2">Quick Tests</h2>
          <div className="space-y-2">
            <a
              href="/api/debug/s3-test"
              target="_blank"
              rel="noopener noreferrer"
              className="block text-blue-600 hover:underline"
            >
              📊 View S3 Test JSON
            </a>
            <a
              href="/api/images?limit=1"
              target="_blank"
              rel="noopener noreferrer"
              className="block text-blue-600 hover:underline"
            >
              🖼️ View Images API JSON
            </a>
          </div>
        </div>

        {/* Next.js Config Check */}
        <div className="bg-yellow-50 rounded-lg p-6">
          <h2 className="text-xl font-semibold mb-2">✅ Next.js Config Updated</h2>
          <p className="text-sm text-gray-700">
            The <code>next.config.js</code> has been updated to allow S3 images. After redeploying,
            images should load correctly.
          </p>
        </div>
      </div>
    </div>
  );
}
