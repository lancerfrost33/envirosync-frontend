/**
 * useChatbotIndexing
 * Sends dashboard data to the backend for RAG indexing.
 * Re-indexes whenever summary/emissions/breakdown meaningfully change.
 */

import { useEffect, useRef } from 'react';
import axios from 'axios';
import { supabase } from '../lib/supabase';

export const useChatbotIndexing = (summary, emissions, breakdown) => {
    const lastIndexedRef = useRef(null);

    useEffect(() => {
        if (!summary) return;

        const indexDashboardData = async () => {
            const { data: { session } } = await supabase.auth.getSession();
            const userEmail = session?.user?.email || 'anonymous';

            if (userEmail === 'anonymous') {
                console.warn('[Chatbot] No Supabase session — cannot index');
                return;
            }

            const fingerprint = JSON.stringify({
                totalCarbon: summary?.totalCarbon,
                totalProjects: summary?.totalProjects,
                emissionsCount: emissions?.length,
                breakdownCount: breakdown?.length,
            });

            if (lastIndexedRef.current === fingerprint) {
                console.log('[Chatbot] Data unchanged — skipping re-index');
                return;
            }

            console.log('[Chatbot] Indexing for:', userEmail);

            try {
                const response = await axios.post(
                    '/api/chatbot/index',
                    { summary, emissions, breakdown },
                    {
                        headers: {
                            'Content-Type': 'application/json',
                            'X-User-Email': userEmail,
                        },
                    }
                );

                if (response.status === 200) {
                    console.log('[Chatbot] ✅ Indexed for:', userEmail);
                    lastIndexedRef.current = fingerprint;
                }
            } catch (err) {
                console.error('[Chatbot] ❌ Indexing failed:', err.response?.data || err.message);
            }
        };

        const timer = setTimeout(indexDashboardData, 1500);
        return () => clearTimeout(timer);

    }, [summary, emissions, breakdown]);

    return !!lastIndexedRef.current;
};