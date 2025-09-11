// supabase/functions/quiz-manager/index.ts
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  const { action, payload } = await req.json()
  const { quizId, playerId, questionId, submittedAnswer } = payload

  const supabaseAdmin = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  );

  if (action === 'SUBMIT_ANSWER') {
    // 1. Get the correct answer from the database
    const { data: question } = await supabaseAdmin
      .from('questions').select('correct_answer').eq('id', questionId).single();

    if (!question) {
      return new Response(JSON.stringify({ error: 'Question not found' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 404
      });
    }

    const isCorrect = question.correct_answer === submittedAnswer;

    // 2. If correct, update the player's score
    if (isCorrect) {
      // rpc is a special supabase function to atomically increment a value
      await supabaseAdmin.rpc('increment_score', { player_id: playerId, increment_amount: 10 });
    }

    // 3. Broadcast an update to the admin lobby
    const channel = supabaseAdmin.channel(`live-lobby-${quizId}`);
    await channel.send({
      type: 'broadcast',
      event: 'player_answered',
      payload: { playerId: playerId },
    });

    // 4. Return the result to the player
    return new Response(JSON.stringify({ correct: isCorrect }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  return new Response(JSON.stringify({ error: 'Invalid action' }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400
  });
});