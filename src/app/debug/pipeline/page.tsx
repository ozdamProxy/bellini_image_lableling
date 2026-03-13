'use client';

import { useEffect, useState } from 'react';

interface PipelineCheckResult {
  timestamp: string;
  environment: string;
  checks: {
    envVars: Record<string, boolean>;
    s3: {
      accessible: boolean;
      error: string | null;
      imageCount: number;
      sampleImages: string[];
    };
    database: {
      accessible: boolean;
      error: string | null;
      imageCount: number;
    };
    sync: {
      attempted: boolean;
      success: boolean;
      error: string | null;
      syncedCount: number;
    };
  };
}

export default function PipelineDebugPage() {
  const [results, setResults] = useState<PipelineCheckResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const runPipelineCheck = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await fetch('/api/debug/pipeline-check');
      const data = await response.json();
      setResults(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    runPipelineCheck();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 p-8">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-3xl font-bold mb-6">🔍 Full Pipeline Check</h1>
          <div className="bg-white rounded-lg shadow p-8">
            <div className="flex items-center justify-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
              <span className="ml-4 text-lg">Running pipeline diagnostics...</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-100 p-8">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-3xl font-bold mb-6 text-red-600">❌ Pipeline Check Failed</h1>
          <div className="bg-white rounded-lg shadow p-6">
            <p className="text-red-600">{error}</p>
            <button
              onClick={runPipelineCheck}
              className="mt-4 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
            >
              Retry
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 p-8">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold">🔍 Full Pipeline Check</h1>
          <button
            onClick={runPipelineCheck}
            className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
          >
            🔄 Re-run Check
          </button>
        </div>

        {/* Environment Info */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-4">Environment</h2>
          <p className="text-sm text-gray-600">
            <strong>Timestamp:</strong> {results?.timestamp}
          </p>
          <p className="text-sm text-gray-600">
            <strong>Node Environment:</strong> {results?.environment}
          </p>
        </div>

        {/* Environment Variables */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-4">🔑 Environment Variables</h2>
          <div className="space-y-2">
            {Object.entries(results?.checks.envVars || {}).map(([key, value]) => (
              <div key={key} className="flex justify-between items-center">
                <code className="text-sm bg-gray-100 px-2 py-1 rounded">{key}</code>
                <span className={value ? 'text-green-600' : 'text-red-600'}>
                  {value ? '✅ Set' : '❌ Missing'}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* S3 Check */}
        <div className={`bg-white rounded-lg shadow p-6 ${results?.checks.s3.error ? 'border-2 border-red-500' : ''}`}>
          <h2 className="text-xl font-semibold mb-4">📦 S3 Connection</h2>
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="font-medium">Status:</span>
              <span className={results?.checks.s3.accessible ? 'text-green-600' : 'text-red-600'}>
                {results?.checks.s3.accessible ? '✅ Connected' : '❌ Failed'}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="font-medium">Images Found:</span>
              <span className="font-semibold">{results?.checks.s3.imageCount || 0}</span>
            </div>
            {results?.checks.s3.error && (
              <div className="mt-3 p-3 bg-red-50 rounded">
                <p className="text-sm font-medium text-red-600">Error:</p>
                <p className="text-sm text-red-800">{results.checks.s3.error}</p>
              </div>
            )}
            {results?.checks.s3.sampleImages && results.checks.s3.sampleImages.length > 0 && (
              <div className="mt-3">
                <p className="text-sm font-medium mb-2">Sample S3 Keys:</p>
                <div className="bg-gray-50 rounded p-3 space-y-1 max-h-40 overflow-y-auto">
                  {results.checks.s3.sampleImages.map((key, i) => (
                    <p key={i} className="text-xs text-gray-700 font-mono break-all">
                      {key}
                    </p>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Database Check */}
        <div className={`bg-white rounded-lg shadow p-6 ${results?.checks.database.error ? 'border-2 border-red-500' : ''}`}>
          <h2 className="text-xl font-semibold mb-4">🗄️ Database Connection</h2>
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="font-medium">Status:</span>
              <span className={results?.checks.database.accessible ? 'text-green-600' : 'text-red-600'}>
                {results?.checks.database.accessible ? '✅ Connected' : '❌ Failed'}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="font-medium">Images in Database:</span>
              <span className="font-semibold">{results?.checks.database.imageCount || 0}</span>
            </div>
            {results?.checks.database.error && (
              <div className="mt-3 p-3 bg-red-50 rounded">
                <p className="text-sm font-medium text-red-600">Error:</p>
                <p className="text-sm text-red-800">{results.checks.database.error}</p>
              </div>
            )}
          </div>
        </div>

        {/* Sync Check */}
        <div className={`bg-white rounded-lg shadow p-6 ${results?.checks.sync.error ? 'border-2 border-red-500' : ''}`}>
          <h2 className="text-xl font-semibold mb-4">🔄 Sync Process</h2>
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="font-medium">Attempted:</span>
              <span>{results?.checks.sync.attempted ? '✅ Yes' : '❌ No'}</span>
            </div>
            <div className="flex justify-between">
              <span className="font-medium">Success:</span>
              <span className={results?.checks.sync.success ? 'text-green-600' : 'text-red-600'}>
                {results?.checks.sync.success ? '✅ Yes' : '❌ No'}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="font-medium">Images After Sync:</span>
              <span className="font-semibold">{results?.checks.sync.syncedCount || 0}</span>
            </div>
            {results?.checks.sync.error && (
              <div className="mt-3 p-3 bg-red-50 rounded">
                <p className="text-sm font-medium text-red-600">Error:</p>
                <p className="text-sm text-red-800">{results.checks.sync.error}</p>
              </div>
            )}
          </div>
        </div>

        {/* Diagnosis */}
        <div className="bg-blue-50 rounded-lg p-6">
          <h2 className="text-xl font-semibold mb-3">🔬 Diagnosis</h2>
          <div className="space-y-2 text-sm">
            {!results?.checks.envVars.AWS_S3_BUCKET && (
              <p className="text-red-700">❌ AWS_S3_BUCKET is not set</p>
            )}
            {!results?.checks.envVars.AWS_ACCESS_KEY_ID && (
              <p className="text-red-700">❌ AWS_ACCESS_KEY_ID is not set</p>
            )}
            {!results?.checks.envVars.AWS_SECRET_ACCESS_KEY && (
              <p className="text-red-700">❌ AWS_SECRET_ACCESS_KEY is not set</p>
            )}
            {!results?.checks.s3.accessible && results?.checks.s3.error && (
              <p className="text-red-700">❌ S3 connection failed: {results.checks.s3.error}</p>
            )}
            {results?.checks.s3.accessible && results?.checks.s3.imageCount === 0 && (
              <p className="text-yellow-700">⚠️ S3 is connected but no images found. Check bucket name and prefix.</p>
            )}
            {results?.checks.s3.accessible && results?.checks.s3.imageCount > 0 && !results?.checks.database.accessible && (
              <p className="text-red-700">❌ S3 has images but database connection failed</p>
            )}
            {results?.checks.s3.accessible && results?.checks.s3.imageCount > 0 && results?.checks.database.accessible && results?.checks.database.imageCount === 0 && !results?.checks.sync.attempted && (
              <p className="text-yellow-700">⚠️ Images found in S3 but sync was not attempted</p>
            )}
            {results?.checks.s3.accessible && results?.checks.s3.imageCount > 0 && results?.checks.sync.attempted && !results?.checks.sync.success && (
              <p className="text-red-700">❌ Sync was attempted but failed: {results.checks.sync.error}</p>
            )}
            {results?.checks.s3.accessible && results?.checks.s3.imageCount > 0 && results?.checks.sync.success && results?.checks.sync.syncedCount > 0 && (
              <p className="text-green-700">✅ All systems operational! Images synced successfully.</p>
            )}
            {results?.checks.s3.accessible && results?.checks.s3.imageCount > 0 && results?.checks.sync.success && results?.checks.sync.syncedCount === 0 && (
              <p className="text-yellow-700">⚠️ Sync succeeded but no new images added. They may already be in the database.</p>
            )}
          </div>
        </div>

        {/* Quick Actions */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-4">⚡ Quick Actions</h2>
          <div className="space-y-3">
            <a
              href="/api/sync"
              target="_blank"
              rel="noopener noreferrer"
              className="block text-center px-4 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
            >
              🔄 Force Sync from S3
            </a>
            <a
              href="/api/images"
              target="_blank"
              rel="noopener noreferrer"
              className="block text-center px-4 py-3 bg-green-500 text-white rounded-lg hover:bg-green-600"
            >
              🖼️ View Images API
            </a>
            <a
              href="/"
              className="block text-center px-4 py-3 bg-purple-500 text-white rounded-lg hover:bg-purple-600"
            >
              🏠 Back to App
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
