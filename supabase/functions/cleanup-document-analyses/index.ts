import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

// Política de retenção
const FILE_RETENTION_DAYS = 30;       // Arquivo original no Storage
const ANALYSIS_RETENTION_DAYS = 180;  // Metadados no banco

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const now = new Date().toISOString();

    // 1) Arquivos expirados (file_expires_at < now e ainda com file_path)
    const { data: expiredFiles, error: filesQueryError } = await supabase
      .from("document_analyses")
      .select("id, file_path")
      .lt("file_expires_at", now)
      .not("file_path", "is", null)
      .limit(1000);

    if (filesQueryError) throw filesQueryError;

    let filesRemoved = 0;
    if (expiredFiles && expiredFiles.length > 0) {
      const paths = expiredFiles
        .map((r) => r.file_path)
        .filter((p): p is string => !!p);

      if (paths.length > 0) {
        const { error: storageError } = await supabase.storage
          .from("document-analyses")
          .remove(paths);
        if (storageError) {
          console.error("Storage remove error:", storageError);
        }
      }

      const ids = expiredFiles.map((r) => r.id);
      const { error: clearError } = await supabase
        .from("document_analyses")
        .update({ file_path: null })
        .in("id", ids);
      if (clearError) throw clearError;

      filesRemoved = paths.length;
    }

    // 2) Registros completamente expirados (expires_at < now)
    const { data: expiredRecords, error: recordsQueryError } = await supabase
      .from("document_analyses")
      .select("id, file_path")
      .lt("expires_at", now)
      .limit(1000);

    if (recordsQueryError) throw recordsQueryError;

    let recordsRemoved = 0;
    if (expiredRecords && expiredRecords.length > 0) {
      // Garantia: remove arquivos remanescentes
      const remainingPaths = expiredRecords
        .map((r) => r.file_path)
        .filter((p): p is string => !!p);
      if (remainingPaths.length > 0) {
        await supabase.storage
          .from("document-analyses")
          .remove(remainingPaths);
      }

      const ids = expiredRecords.map((r) => r.id);
      const { error: deleteError } = await supabase
        .from("document_analyses")
        .delete()
        .in("id", ids);
      if (deleteError) throw deleteError;

      recordsRemoved = ids.length;
    }

    const summary = {
      ok: true,
      ranAt: now,
      policy: {
        fileRetentionDays: FILE_RETENTION_DAYS,
        analysisRetentionDays: ANALYSIS_RETENTION_DAYS,
      },
      filesRemoved,
      recordsRemoved,
    };

    console.log("cleanup-document-analyses:", summary);

    return new Response(JSON.stringify(summary), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (e: any) {
    console.error("cleanup-document-analyses error:", e);
    return new Response(
      JSON.stringify({ ok: false, error: e?.message ?? String(e) }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
});
