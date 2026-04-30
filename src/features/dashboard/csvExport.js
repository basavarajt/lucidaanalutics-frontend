const resolveRowsToExport = (results, viewFilter) => {
  if (!Array.isArray(results) || results.length === 0) {
    return { rowsToExport: [], filterSuffix: 'all' };
  }

  if (viewFilter === 'worst100') {
    return {
      rowsToExport: [...results].reverse().slice(0, 100),
      filterSuffix: 'worst-100',
    };
  }

  if (viewFilter?.startsWith('top')) {
    const n = parseInt(viewFilter.replace('top', ''), 10);
    return {
      rowsToExport: results.slice(0, Number.isFinite(n) ? n : results.length),
      filterSuffix: `top-${Number.isFinite(n) ? n : results.length}`,
    };
  }

  return { rowsToExport: results, filterSuffix: 'all' };
};

const csvEscape = (value) => {
  const normalized = value === null || value === undefined ? '' : String(value);
  return `"${normalized.replace(/"/g, '""')}"`;
};

const normalizePipeList = (value) => {
  if (Array.isArray(value)) {
    return value.join(' | ');
  }
  if (value === null || value === undefined) {
    return '';
  }
  return String(value);
};

const triggerCsvDownload = (fileName, csvContent) => {
  const triggerAnchorDownload = (href) => {
    const link = document.createElement('a');
    link.href = href;
    link.download = fileName;
    link.rel = 'noopener';
    link.style.display = 'none';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  try {
    const contentWithBom = `\uFEFF${csvContent}`;
    const blob = new Blob([contentWithBom], { type: 'text/csv;charset=utf-8;' });

    if (typeof window !== 'undefined' && window.navigator?.msSaveOrOpenBlob) {
      window.navigator.msSaveOrOpenBlob(blob, fileName);
      return true;
    }

    const url = URL.createObjectURL(blob);
    triggerAnchorDownload(url);

    // Delay revocation so Safari/Firefox have time to consume the blob URL.
    setTimeout(() => URL.revokeObjectURL(url), 60_000);
    return true;
  } catch {
    try {
      const dataUri = `data:text/csv;charset=utf-8,${encodeURIComponent(`\uFEFF${csvContent}`)}`;
      triggerAnchorDownload(dataUri);
      return true;
    } catch {
      return false;
    }
  }
};

export const downloadScoringCsv = (scoringData, viewFilter = 'all') => {
  try {
    const results = scoringData?.results;
    if (!Array.isArray(results) || results.length === 0) {
      return { ok: false, error: 'No scored rows available to export.' };
    }

    const total = results.length;
    const { rowsToExport, filterSuffix } = resolveRowsToExport(results, viewFilter);
    if (!Array.isArray(rowsToExport) || rowsToExport.length === 0) {
      return { ok: false, error: 'No rows matched the selected filter for CSV export.' };
    }

    const headers = [
      'Rank',
      'Profile_Score_%',
      'Engagement_Score_%',
      'Recommended_Action',
      'Action_Priority',
      'Top_Leading_Factors',
      'Top_Engagement_Signals',
    ];

    const dataKeys = new Set();
    rowsToExport.forEach((row) => {
      if (row && row.data && typeof row.data === 'object' && !Array.isArray(row.data)) {
        Object.keys(row.data).forEach((key) => dataKeys.add(key));
      }
    });
    const dataKeysArr = Array.from(dataKeys);
    headers.push(...dataKeysArr);

    const csvRows = [];
    csvRows.push(headers.map(csvEscape).join(','));

    rowsToExport.forEach((row, idx) => {
      const rank = viewFilter === 'worst100' ? total - idx : idx + 1;
      const profileScore = Number(row?.profile_score ?? row?.score ?? 0);
      const safeProfileScore = Number.isFinite(profileScore) ? profileScore.toFixed(2) : '';
      const engagementScore = Number(row?.engagement_score);
      const safeEngagementScore = Number.isFinite(engagementScore) ? engagementScore.toFixed(2) : '';

      const cols = [
        rank,
        safeProfileScore,
        safeEngagementScore,
        row?.recommended_action || '',
        row?.action_priority || '',
        normalizePipeList(row?.top_drivers),
        normalizePipeList(row?.top_engagement_signals),
      ];

      dataKeysArr.forEach((key) => {
        const value = row?.data && typeof row.data === 'object' && !Array.isArray(row.data)
          ? row.data[key]
          : '';
        cols.push(value ?? '');
      });

      csvRows.push(cols.map(csvEscape).join(','));
    });

    const safeModelName = String(scoringData.model_name || 'scored').replace(/[^a-zA-Z0-9_-]/g, '_');
    const fileName = `lucida-${filterSuffix}-${safeModelName}.csv`;
    const ok = triggerCsvDownload(fileName, csvRows.join('\n'));
    if (!ok) {
      return { ok: false, error: 'Browser blocked CSV download. Please retry and allow downloads for this site.' };
    }

    return { ok: true, fileName, rowCount: rowsToExport.length };
  } catch {
    return { ok: false, error: 'CSV export failed due to an unexpected data format.' };
  }
};
