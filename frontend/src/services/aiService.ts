/**
 * AI Services for Business Intelligence, Fiscal Law, and Personal Context
 */

const API_BASE = '/api/v1';

// Business Consultant Services
export const businessConsult = async (question: string, userId?: string | number) => {
  try {
    const response = await fetch(`${API_BASE}/business/consultant.php`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        question,
        user_id: userId?.toString()
      }),
    });

    if (!response.ok) {
      throw new Error('Failed to get business consultation');
    }

    return await response.json();
  } catch (error) {
    console.error('Business consultation error:', error);
    throw error;
  }
};

export const getBusinessInsights = async (userId: string) => {
  try {
    const response = await fetch(`${API_BASE}/business/insights.php`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user_id: userId }),
    });

    if (!response.ok) {
      throw new Error('Failed to get business insights');
    }

    return await response.json();
  } catch (error) {
    console.error('Business insights error:', error);
    throw error;
  }
};

// Fiscal Law AI Services
export const fiscalConsult = async (question: string) => {
  try {
    const response = await fetch(`${API_BASE}/fiscal/ai-consultant.php`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ question }),
    });

    if (!response.ok) {
      throw new Error('Failed to get fiscal consultation');
    }

    return await response.json();
  } catch (error) {
    console.error('Fiscal consultation error:', error);
    throw error;
  }
};

// Personal Context Services
export const getPersonalContext = async (userId: string | number) => {
  try {
    const response = await fetch(`${API_BASE}/context/get.php?user_id=${userId.toString()}`);

    if (!response.ok) {
      throw new Error('Failed to get personal context');
    }

    return await response.json();
  } catch (error) {
    console.error('Get context error:', error);
    throw error;
  }
};

export const createPersonalContext = async (userId: string, contextData: any) => {
  try {
    const response = await fetch(`${API_BASE}/context/create.php`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        user_id: userId,
        context_data: contextData
      }),
    });

    if (!response.ok) {
      throw new Error('Failed to create personal context');
    }

    return await response.json();
  } catch (error) {
    console.error('Create context error:', error);
    throw error;
  }
};

export const updatePersonalContext = async (
  userId: string | number,
  updates: any,
  changeReason?: string
) => {
  try {
    const response = await fetch(`${API_BASE}/context/update.php`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        user_id: userId.toString(),
        updates,
        change_reason: changeReason
      }),
    });

    if (!response.ok) {
      throw new Error('Failed to update personal context');
    }

    return await response.json();
  } catch (error) {
    console.error('Update context error:', error);
    throw error;
  }
};

export const exportPersonalContext = async (userId: string | number) => {
  try {
    const response = await fetch(`${API_BASE}/context/export.php?user_id=${userId.toString()}`);

    if (!response.ok) {
      throw new Error('Failed to export personal context');
    }

    const data = await response.json();

    // Create download
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `business_context_${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);

    return data;
  } catch (error) {
    console.error('Export context error:', error);
    throw error;
  }
};

export const importPersonalContext = async (userId: string | number, contextData: any) => {
  try {
    const response = await fetch(`${API_BASE}/context/import.php`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        user_id: userId,
        context_data: contextData
      }),
    });

    if (!response.ok) {
      throw new Error('Failed to import personal context');
    }

    return await response.json();
  } catch (error) {
    console.error('Import context error:', error);
    throw error;
  }
};

export const getContextTemplates = async () => {
  try {
    const response = await fetch(`${API_BASE}/context/templates.php`);

    if (!response.ok) {
      throw new Error('Failed to get context templates');
    }

    return await response.json();
  } catch (error) {
    console.error('Get templates error:', error);
    throw error;
  }
};
