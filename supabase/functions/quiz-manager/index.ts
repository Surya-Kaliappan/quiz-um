import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  const { action, payload } = await req.json()
  const { quizId, playerId, questionId, submittedAnswer, questionStartTime } = payload

  const supabaseAdmin = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  );

  if (action === 'SUBMIT_ANSWER') {
    const { data: quiz } = await supabaseAdmin
      .from('quizzes').select('per_question_timer').eq('id', quizId).single();
    
    const timeLimit = quiz?.per_question_timer;

    if (timeLimit && questionStartTime) {
      const startTime = new Date(questionStartTime).getTime();
      const now = new Date().getTime();
      const elapsed = (now - startTime) / 1000;
      if (elapsed > (timeLimit + 34)) {
        return new Response(JSON.stringify({ error: "Time's up!", correct: false }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }
    }

    const { data: question } = await supabaseAdmin
      .from('questions').select('correct_answer').eq('id', questionId).single();
    if (!question) {
      return new Response(JSON.stringify({ error: 'Question not found' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 404
      });
    }

    const isCorrect = question.correct_answer === submittedAnswer;

    if (isCorrect) {
      await supabaseAdmin.rpc('increment_score', { player_id: playerId, increment_amount: 1 });
    }

    const channel = supabaseAdmin.channel(`live-lobby-${quizId}`);
    await channel.send({
      type: 'broadcast',
      event: 'player_answered',
      payload: { playerId: playerId },
    });

    return new Response(JSON.stringify({ correct: isCorrect }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  return new Response(JSON.stringify({ error: 'Invalid action' }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400
  });
});