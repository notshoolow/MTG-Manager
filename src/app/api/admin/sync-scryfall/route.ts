import { NextResponse } from 'next/server';
import { spawn } from 'child_process';
import path from 'path';

export async function POST() {
  try {
    // Se ejecuta el script en segundo plano utilizando el método spawn
    // para evitar que la solicitud HTTP exceda el tiempo límite (timeout) al procesar la descarga
    const scriptPath = path.join(process.cwd(), 'src', 'scripts', 'sync-scryfall.mts');
    
    const child = spawn('npx', ['tsx', scriptPath], {
      detached: true,
      stdio: 'ignore'
    });
    
    // Se desvincula el proceso hijo para permitir su ejecución independiente del proceso principal
    child.unref();

    return NextResponse.json({ success: true, message: "Sync started in background." });
  } catch (error: any) {
    console.error("Failed to start sync:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
