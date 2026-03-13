import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET() {
  const envVars = {
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV,
    variables: {
      AWS_REGION: {
        set: !!process.env.AWS_REGION,
        value: process.env.AWS_REGION || 'NOT_SET',
        length: process.env.AWS_REGION?.length || 0,
      },
      AWS_ACCESS_KEY_ID: {
        set: !!process.env.AWS_ACCESS_KEY_ID,
        value: process.env.AWS_ACCESS_KEY_ID ? `${process.env.AWS_ACCESS_KEY_ID.substring(0, 10)}...` : 'NOT_SET',
        length: process.env.AWS_ACCESS_KEY_ID?.length || 0,
      },
      AWS_SECRET_ACCESS_KEY: {
        set: !!process.env.AWS_SECRET_ACCESS_KEY,
        value: process.env.AWS_SECRET_ACCESS_KEY ? `***SECRET*** (${process.env.AWS_SECRET_ACCESS_KEY.length} chars)` : 'NOT_SET',
        length: process.env.AWS_SECRET_ACCESS_KEY?.length || 0,
      },
      AWS_S3_BUCKET: {
        set: !!process.env.AWS_S3_BUCKET,
        value: process.env.AWS_S3_BUCKET || 'NOT_SET',
        length: process.env.AWS_S3_BUCKET?.length || 0,
      },
      NEXT_PUBLIC_SUPABASE_URL: {
        set: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
        value: process.env.NEXT_PUBLIC_SUPABASE_URL || 'NOT_SET',
        length: process.env.NEXT_PUBLIC_SUPABASE_URL?.length || 0,
      },
      NEXT_PUBLIC_SUPABASE_ANON_KEY: {
        set: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
        value: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? `${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY.substring(0, 20)}...` : 'NOT_SET',
        length: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.length || 0,
      },
    },
  };

  const allSet = Object.values(envVars.variables).every(v => v.set);

  return NextResponse.json({
    ...envVars,
    summary: {
      allSet,
      missingVars: Object.entries(envVars.variables)
        .filter(([_, v]) => !v.set)
        .map(([name, _]) => name),
    },
  });
}
