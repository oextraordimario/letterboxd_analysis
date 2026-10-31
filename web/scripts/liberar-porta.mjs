// Roda antes do `npm run dev` (predev): mata o Next deste repo que ficou órfão de um dev
// anterior. No Windows, matar o processo pai não leva os filhos junto. O shell morre e o
// next/start-server.js continua segurando a porta 3047. Só toca em node.exe cuja linha de
// comando aponte para o node_modules/next deste repo. Fora do Windows, não faz nada.

import { execFileSync } from "node:child_process";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

if (process.platform !== "win32") process.exit(0);

const normalizar = (s) => s.replaceAll("\\", "/").toLowerCase();
const NEXT = normalizar(resolve(dirname(fileURLToPath(import.meta.url)), "..", "node_modules", "next"));

const saida = execFileSync(
  "powershell",
  ["-NoProfile", "-Command", "Get-CimInstance Win32_Process -Filter \"Name='node.exe'\" | Select-Object ProcessId, CommandLine | ConvertTo-Json"],
  { encoding: "utf8" },
);
const processos = [JSON.parse(saida || "[]")].flat();
const orfaos = processos.filter((p) => p.CommandLine && normalizar(p.CommandLine).includes(NEXT));

for (const { ProcessId } of orfaos) {
  try {
    execFileSync("taskkill", ["/PID", String(ProcessId), "/T", "/F"], { stdio: "ignore" });
  } catch {
    // já tinha morrido junto com o pai, que veio antes na lista
  }
}
if (orfaos.length) console.log(`liberar-porta: ${orfaos.length} processo(s) do Next órfão(s) encerrado(s)`);
