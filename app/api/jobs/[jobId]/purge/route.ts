import { NextResponse } from 'next/server';
import { ApiError } from '@/lib/api/errors';
import { getRedMeshApiService } from '@/lib/services/redmeshApi';

interface RouteParams {
  params: Promise<{ jobId: string }>;
}

/**
 * DELETE /api/jobs/[jobId]/purge
 * Purge a job: delete all R1FS artifacts and tombstone the CStore entry.
 * Job must be finished/canceled — cannot purge a running job.
 */
export async function DELETE(request: Request, { params }: RouteParams) {
  if (process.env.NODE_ENV !== 'development') {
    return NextResponse.json({ message: 'Purge is only available in development mode.' }, { status: 403 });
  }

  const { jobId } = await params;

  if (!jobId || typeof jobId !== 'string') {
    return NextResponse.json({ message: 'Job ID is required.' }, { status: 400 });
  }

  try {
    const api = getRedMeshApiService();
    const result = await api.purgeJob(jobId);

    if (result.status !== 'success') {
      return NextResponse.json({ message: (result as unknown as { message?: string }).message || 'Failed to purge job.' }, { status: 400 });
    }

    return NextResponse.json(result, { status: 200 });
  } catch (error) {
    if (error instanceof ApiError) {
      return NextResponse.json({ message: error.message }, { status: error.status });
    }

    console.error('Unexpected job purge error', error);
    return NextResponse.json({ message: 'Unable to purge job.' }, { status: 500 });
  }
}
