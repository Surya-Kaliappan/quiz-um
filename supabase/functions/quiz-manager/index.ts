// supabase/functions/quiz-manager/index.ts
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'

let sessions = {} // In-memory storage for all active quiz sessions

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  const { action, sessionId, payload } = await req.json();
  
  const supabaseAdmin = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  );

  // Initialize session if it doesn't exist
  if (!sessions[sessionId]) {
    sessions[sessionId] = { 
      quizTitle: '',
      players: [], 
      questions: [],
      currentQuestionIndex: -1,
      status: 'lobby',
    };
  }
  
  const session = sessions[sessionId];

  switch (action) {
    case 'ADMIN_START_QUIZ':
      const { data: quizData, error } = await supabaseAdmin
        .from('quizzes')
        .select(`*, questions(*)`)
        .eq('id', sessionId)
        .single();

      if (quizData) {
        session.quizTitle = quizData.title;
        session.questions = quizData.questions || [];
        session.status = 'active';
        session.currentQuestionIndex = 0;
      }
      break;
    
    case 'ADMIN_NEXT_QUESTION':
      if (session.currentQuestionIndex < session.questions.length - 1) {
        session.currentQuestionIndex++;
      } else {
        session.status = 'finished';
      }
      break;

    case 'PLAYER_JOIN':
      if (!session.players.some(p => p.name === payload.playerName)) {
        session.players.push({ name: payload.playerName, score: 0 });
      }
      break;
  }

  // Broadcast the updated state
  const channel = supabaseAdmin.channel(`quiz-${sessionId}`);
  await channel.send({
    type: 'broadcast',
    event: 'STATE_UPDATE',
    payload: session,
  });

  return new Response(JSON.stringify(session), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
});