export const ensureCsvFilesSelected = (files) => Array.isArray(files) && files.length > 0;

const clampSeconds = (value, min, max) => Math.max(min, Math.min(max, Math.ceil(value)));

const getUploadStats = (files) => {
  const selectedFiles = Array.isArray(files) ? files : [];
  const fileCount = Math.max(1, selectedFiles.length);
  const totalSizeBytes = selectedFiles.reduce((sum, file) => sum + (file?.size || 0), 0);
  const totalSizeMb = totalSizeBytes / (1024 * 1024);
  const approximateRows = Math.max(500, Math.round(totalSizeBytes / 90));

  return {
    fileCount,
    totalSizeMb,
    approximateRows,
  };
};

export const estimatePipelineSeconds = (activeTab, files) => {
  const { fileCount, totalSizeMb, approximateRows } = getUploadStats(files);

  if (activeTab === 'train') {
    const mergeCost = Math.max(0, fileCount - 1) * 7;
    const ingestCost = (approximateRows / 15000) * 10;
    const fitCost = Math.sqrt(approximateRows) / 3.5;
    return clampSeconds(28 + mergeCost + ingestCost + fitCost + totalSizeMb * 2.5, 35, 540);
  }

  if (activeTab === 'score') {
    return clampSeconds(10 + totalSizeMb * 2.8 + fileCount * 3, 12, 180);
  }

  return clampSeconds(16 + totalSizeMb * 3.2 + fileCount * 4, 20, 240);
};

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

export const pollTrainingCompletion = async ({
  jobId,
  estimatedSeconds,
  getTrainingStatus,
  onStatus,
}) => {
  const pollEveryMs = 2000;
  const timeoutMs = Math.max(5 * 60 * 1000, estimatedSeconds * 6000);
  const deadline = Date.now() + timeoutMs;
  let lastStatus = null;

  while (Date.now() < deadline) {
    const statusResp = await getTrainingStatus(jobId);
    const statusData = statusResp?.data;
    lastStatus = statusData;

    if (!statusResp?.success || !statusData) {
      throw new Error('Unable to read training status.');
    }

    if (typeof onStatus === 'function') {
      onStatus(statusData);
    }

    if (statusData.status === 'completed') {
      return;
    }

    if (statusData.status === 'failed' || statusData.status === 'cancelled') {
      throw new Error(statusData.error || `Training job ${statusData.status}.`);
    }

    await sleep(pollEveryMs);
  }

  throw new Error(`Training timed out (last status: ${lastStatus?.status || 'unknown'}).`);
};

export const fetchTrainingResult = async ({
  jobId,
  getTrainingResult,
}) => {
  for (let attempt = 0; attempt < 5; attempt += 1) {
    const resultResp = await getTrainingResult(jobId);
    if (resultResp?.success && resultResp?.data?.result) {
      return resultResp.data.result;
    }

    const errorCode = resultResp?.error?.code;
    if (errorCode !== 'JOB_NOT_READY') {
      throw new Error(resultResp?.error?.message || 'Unable to fetch training result.');
    }

    await sleep(1000);
  }

  throw new Error('Training result was not ready after completion.');
};

export const normalizeTrainingResult = (result, uploadedFileCount, mode, fallbackModelName) => {
  const rowCount = result?.dataset?.rows ?? 0;
  const featureCount = result?.analysis?.n_features ?? 0;
  const modeSuffix = mode === 'unsupervised' ? ' - UNSUPERVISED RANKING (no target needed)' : '';

  return {
    status: 'success',
    model_name: result?.model_name || fallbackModelName,
    training_mode: mode,
    message: `Trained on ${rowCount} samples (${uploadedFileCount} files) with ${featureCount} features${modeSuffix}`,
    analysis: result?.analysis || {},
    metrics: result?.metrics || {},
    merge_plan: result?.merge_summary || null,
    compression: result?.compression || null,
    persistence_warning: null,
  };
};

export const extractDashboardErrorMessage = (error, fallback = 'An unexpected anomaly occurred.') => {
  const statusCode = error?.response?.status;
  if (statusCode === 401) {
    return 'Session expired or auth token missing. Please sign in again.';
  }
  if (statusCode === 502 || statusCode === 503 || statusCode === 504) {
    return 'Backend is temporarily unavailable (likely restarting). Wait 20-30 seconds and retry.';
  }

  const backendErr = error?.response?.data?.error?.message;
  const detailErr = error?.response?.data?.detail;
  const corsHint =
    typeof error?.message === 'string' && error.message.toLowerCase().includes('network error')
      ? 'Network request failed. If browser shows CORS + 502, backend is restarting or gateway failed.'
      : null;
  return backendErr || detailErr || corsHint || error?.message || fallback;
};
