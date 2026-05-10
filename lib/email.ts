import { Resend } from "resend";

function getResend() {
  const key = process.env.RESEND_API_KEY;
  if (!key) throw new Error("RESEND_API_KEY não configurado");
  return new Resend(key);
}

export interface DadosConfirmacao {
  clienteNome: string;
  clienteEmail: string;
  pedidoCodigo: string;
  pedidoTipo: string;        // "consulta" | "servico"
  valorTotal: number;
  itens: { nome: string; valor: number }[];
}

export async function enviarEmailConfirmacao(dados: DadosConfirmacao) {
  const { clienteNome, clienteEmail, pedidoCodigo, pedidoTipo, valorTotal, itens } = dados;

  const tipoLabel = pedidoTipo === "consulta" ? "Consulta" : "Serviço";
  const prazoInfo = pedidoTipo === "consulta"
    ? "Seu relatório será entregue em até <strong>24 horas</strong> via WhatsApp."
    : "Nossa equipe entrará em contato pelo WhatsApp para iniciar o processo.";

  const itensHtml = itens
    .map(
      (item) =>
        `<tr>
          <td style="padding:8px 0;border-bottom:1px solid #f0f0f0;color:#374151;font-size:14px;">${item.nome}</td>
          <td style="padding:8px 0;border-bottom:1px solid #f0f0f0;color:#374151;font-size:14px;text-align:right;">
            R$ ${item.valor.toFixed(2).replace(".", ",")}
          </td>
        </tr>`
    )
    .join("");

  const html = `
<!DOCTYPE html>
<html lang="pt-BR">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#f3f4f6;font-family:Arial,Helvetica,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f3f4f6;padding:32px 16px;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:16px;overflow:hidden;max-width:600px;width:100%;">

        <!-- Header -->
        <tr>
          <td style="background:#1e3a5f;padding:32px 40px;text-align:center;">
            <p style="margin:0;color:#c49240;font-size:11px;font-weight:bold;letter-spacing:2px;text-transform:uppercase;">Expert Soluções Financeiras</p>
            <h1 style="margin:12px 0 0;color:#ffffff;font-size:24px;font-weight:bold;">Pagamento confirmado ✓</h1>
          </td>
        </tr>

        <!-- Body -->
        <tr>
          <td style="padding:40px;">
            <p style="margin:0 0 20px;color:#374151;font-size:16px;">Olá, <strong>${clienteNome}</strong>!</p>
            <p style="margin:0 0 28px;color:#6b7280;font-size:15px;line-height:1.6;">
              Seu pagamento foi confirmado e seu pedido está em andamento. ${prazoInfo}
            </p>

            <!-- Número do pedido -->
            <div style="background:#f9fafb;border:1px solid #e5e7eb;border-radius:12px;padding:20px;margin-bottom:28px;text-align:center;">
              <p style="margin:0;color:#6b7280;font-size:12px;text-transform:uppercase;letter-spacing:1px;">Número do pedido</p>
              <p style="margin:8px 0 0;color:#1e3a5f;font-size:28px;font-weight:bold;letter-spacing:2px;">${pedidoCodigo}</p>
            </div>

            <!-- Itens -->
            <p style="margin:0 0 12px;color:#374151;font-size:14px;font-weight:bold;text-transform:uppercase;letter-spacing:1px;">${tipoLabel} contratada</p>
            <table width="100%" cellpadding="0" cellspacing="0">
              ${itensHtml}
            </table>

            <!-- Total -->
            <table width="100%" cellpadding="0" cellspacing="0" style="margin-top:16px;">
              <tr>
                <td style="padding:12px 0;color:#1e3a5f;font-size:16px;font-weight:bold;">Total pago</td>
                <td style="padding:12px 0;color:#c49240;font-size:20px;font-weight:bold;text-align:right;">
                  R$ ${valorTotal.toFixed(2).replace(".", ",")}
                </td>
              </tr>
            </table>

            <hr style="border:none;border-top:1px solid #e5e7eb;margin:28px 0;">

            <!-- Próximos passos -->
            <p style="margin:0 0 12px;color:#374151;font-size:14px;font-weight:bold;">Próximos passos</p>
            <ul style="margin:0;padding-left:20px;color:#6b7280;font-size:14px;line-height:2;">
              ${pedidoTipo === "consulta"
                ? "<li>Aguarde o relatório via WhatsApp em até 24 horas</li><li>Verifique seu WhatsApp cadastrado</li>"
                : "<li>Nossa equipe entrará em contato pelo WhatsApp</li><li>Você receberá o contrato por e-mail para assinatura digital</li>"}
              <li>Dúvidas? Fale com a gente pelo WhatsApp</li>
            </ul>
          </td>
        </tr>

        <!-- Footer -->
        <tr>
          <td style="background:#f9fafb;border-top:1px solid #e5e7eb;padding:24px 40px;text-align:center;">
            <p style="margin:0;color:#9ca3af;font-size:12px;">
              Expert Soluções Financeiras · expertsolucoes.com.br
            </p>
            <p style="margin:8px 0 0;color:#9ca3af;font-size:11px;">
              Este e-mail é uma confirmação automática. Não responda a esta mensagem.
            </p>
          </td>
        </tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`;

  try {
    if (!process.env.RESEND_API_KEY) {
      console.warn("[Email] RESEND_API_KEY não configurado — e-mail não enviado");
      return;
    }
    const { error } = await getResend().emails.send({
      from: "Expert Soluções Financeiras <confirmacao@expertsolucoes.com.br>",
      to: clienteEmail,
      subject: `✓ Pedido ${pedidoCodigo} confirmado — Expert Soluções Financeiras`,
      html,
    });

    if (error) {
      console.error("[Email] Erro ao enviar confirmação:", error);
    } else {
      console.log(`[Email] Confirmação enviada para ${clienteEmail} (pedido ${pedidoCodigo})`);
    }
  } catch (err) {
    console.error("[Email] Falha inesperada:", err);
  }
}

// ─── E-mail de contrato assinado ─────────────────────────────────────────────

export interface DadosContratoAssinado {
  clienteNome: string;
  clienteEmail: string;
  pedidoCodigo: string;
  nomeServico: string;
  assinadoEm: Date;
  contratoUrl: string; // link para baixar/visualizar o contrato assinado
}

export async function enviarEmailContratoAssinado(dados: DadosContratoAssinado) {
  const { clienteNome, clienteEmail, pedidoCodigo, nomeServico, assinadoEm, contratoUrl } = dados;

  const dataFmt = assinadoEm.toLocaleDateString("pt-BR", {
    day: "2-digit", month: "long", year: "numeric",
    hour: "2-digit", minute: "2-digit",
    timeZone: "America/Sao_Paulo",
  });

  const html = `
<!DOCTYPE html>
<html lang="pt-BR">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#f3f4f6;font-family:Arial,Helvetica,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f3f4f6;padding:32px 16px;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:16px;overflow:hidden;max-width:600px;width:100%;">

        <!-- Header -->
        <tr>
          <td style="background:#1e3a5f;padding:32px 40px;text-align:center;">
            <p style="margin:0;color:#c49240;font-size:11px;font-weight:bold;letter-spacing:2px;text-transform:uppercase;">Expert Soluções Financeiras</p>
            <h1 style="margin:12px 0 0;color:#ffffff;font-size:24px;font-weight:bold;">Contrato assinado ✍️</h1>
          </td>
        </tr>

        <!-- Body -->
        <tr>
          <td style="padding:40px;">
            <p style="margin:0 0 20px;color:#374151;font-size:16px;">Olá, <strong>${clienteNome}</strong>!</p>
            <p style="margin:0 0 28px;color:#6b7280;font-size:15px;line-height:1.6;">
              Seu contrato foi assinado com sucesso e o processo do seu serviço está oficialmente iniciado.
            </p>

            <!-- Info do contrato -->
            <div style="background:#f9fafb;border:1px solid #e5e7eb;border-radius:12px;padding:24px;margin-bottom:28px;">
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="padding:8px 0;color:#6b7280;font-size:13px;">Número do pedido</td>
                  <td style="padding:8px 0;color:#1e3a5f;font-size:13px;font-weight:bold;text-align:right;">${pedidoCodigo}</td>
                </tr>
                <tr>
                  <td style="padding:8px 0;color:#6b7280;font-size:13px;border-top:1px solid #e5e7eb;">Serviço</td>
                  <td style="padding:8px 0;color:#374151;font-size:13px;text-align:right;border-top:1px solid #e5e7eb;">${nomeServico}</td>
                </tr>
                <tr>
                  <td style="padding:8px 0;color:#6b7280;font-size:13px;border-top:1px solid #e5e7eb;">Assinado em</td>
                  <td style="padding:8px 0;color:#374151;font-size:13px;text-align:right;border-top:1px solid #e5e7eb;">${dataFmt}</td>
                </tr>
              </table>
            </div>

            <!-- CTA -->
            <div style="text-align:center;margin-bottom:28px;">
              <a href="${contratoUrl}" style="display:inline-block;background:#c49240;color:#ffffff;font-size:14px;font-weight:bold;padding:14px 32px;border-radius:10px;text-decoration:none;">
                📄 Visualizar contrato assinado
              </a>
            </div>

            <!-- Próximos passos -->
            <p style="margin:0 0 12px;color:#374151;font-size:14px;font-weight:bold;">O que acontece agora</p>
            <ul style="margin:0;padding-left:20px;color:#6b7280;font-size:14px;line-height:2;">
              <li>Nossa equipe já foi notificada e iniciará o processo</li>
              <li>Você receberá atualizações pelo WhatsApp</li>
              <li>Guarde este e-mail como comprovante da assinatura</li>
            </ul>
          </td>
        </tr>

        <!-- Footer -->
        <tr>
          <td style="background:#f9fafb;border-top:1px solid #e5e7eb;padding:24px 40px;text-align:center;">
            <p style="margin:0;color:#9ca3af;font-size:12px;">
              Expert Soluções Financeiras · expertsolucoes.com.br
            </p>
            <p style="margin:8px 0 0;color:#9ca3af;font-size:11px;">
              Este e-mail é uma confirmação automática. Não responda a esta mensagem.
            </p>
          </td>
        </tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`;

  try {
    if (!process.env.RESEND_API_KEY) {
      console.warn("[Email] RESEND_API_KEY não configurado — e-mail de contrato não enviado");
      return;
    }
    const { error } = await getResend().emails.send({
      from: "Expert Soluções Financeiras <confirmacao@expertsolucoes.com.br>",
      to: clienteEmail,
      subject: `✍️ Contrato ${pedidoCodigo} assinado — Expert Soluções Financeiras`,
      html,
    });

    if (error) {
      console.error("[Email] Erro ao enviar contrato assinado:", error);
    } else {
      console.log(`[Email] Contrato assinado enviado para ${clienteEmail} (pedido ${pedidoCodigo})`);
    }
  } catch (err) {
    console.error("[Email] Falha inesperada ao enviar contrato:", err);
  }
}
