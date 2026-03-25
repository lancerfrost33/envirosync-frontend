const API_BASE = import.meta.env.VITE_API_URL;

export const saveDraft = async (stage, fileName, pageData, projectId = null, token) => {
  const payload = {
    stage,
    file_name: fileName,
    project_id: projectId,
    page_data: pageData,
  };

  const res = await fetch(`${API_BASE}/api/drafts`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify(payload),
  });

  if (!res.ok) throw new Error('Failed to save draft');
  return await res.json();
};

export const deleteDraftByStage = async (stage, token) => {
  await fetch(`${API_BASE}/api/drafts/${stage}`, {
    method: 'DELETE',
    headers: { 'Authorization': `Bearer ${token}` },
  });
};

export const clearAllProjectDrafts = async (projectId, token) => {
  await fetch(`${API_BASE}/api/drafts/project/${projectId}`, {
    method: 'DELETE',
    headers: { 'Authorization': `Bearer ${token}` },
  });
};