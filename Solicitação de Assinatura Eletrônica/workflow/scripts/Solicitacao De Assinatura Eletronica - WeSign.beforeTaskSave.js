// TAE
function beforeTaskSave(colleagueId, nextSequenceId, userList) {
    var atividade = String(getValue("WKNumState"));

    if (atividade == "0" || atividade == "4") {
        hAPI.setCardValue(
            "numProcess",
            getValue("WKNumProces")
        );

        AnexarDocumento(
            hAPI.getCardValue("docId")
        );
    }

    var devePublicarTAE =
        (atividade == "5" &&
            hAPI.getCardValue("hiddenAprovacao") == "Aprovar") ||
        ((atividade == "0" || atividade == "4") &&
            hAPI.getCardValue("SolicitanteAprovaSolicitacao") == "true");

    if (devePublicarTAE) {
        var token = ObterTokenTAE();

        var idDocumento = UploadDocumentoTAE(
            hAPI.getCardValue("docId"),
            hAPI.getCardValue("docName"),
            token
        );

        log.info(
            "beforeTaskSave - Upload TAE concluido. idDocumento: " +
            idDocumento
        );

        var agora = new java.util.Date();
        hAPI.setCardValue("taeEnvelopeId", String(idDocumento));
        hAPI.setCardValue("taeDataEnvio", new java.text.SimpleDateFormat("dd/MM/yyyy").format(agora));
        hAPI.setCardValue("taeHoraEnvio", new java.text.SimpleDateFormat("HH:mm").format(agora));

        var envelopeInfo = ConsultarEnvelopeTAE(
            idDocumento,
            token
        );

        log.info(
            "beforeTaskSave - Envelope TAE consultado. Status: " +
            envelopeInfo.status
        );

        PublicarEnvelopeTAE(
            idDocumento,
            hAPI.getCardValue("jsonSigner"),
            token
        );

        log.info(
            "beforeTaskSave - Envelope TAE publicado com sucesso."
        );
    }
    RegistraHistorico(atividade);
}

// CHAMA SERVIÇO
function ChamarTAE(endpoint, method, token, params) {
    var clientService = fluigAPI.getAuthorizeClientService();

    var requisicao = {
        companyId: String(getValue("WKCompany")),
        serviceCode: "TAE",
        endpoint: endpoint,
        method: method,
        timeoutService: "200",
        headers: {
            "Content-Type": "application/json",
            "Authorization": "Bearer " + token,
            "Accept": "application/json"
        }
    };

    if (params != null) {
        requisicao.params = params;
    }

    var resposta = clientService.invoke(
        JSON.stringify(requisicao)
    );

    var statusCode = String(
        resposta.getHttpStatusResult()
    );

    var resultadoRaw = resposta.getResult();

    if (resultadoRaw == null || resultadoRaw == "") {
        throw "TAE nao retornou resposta. HTTP " +
            statusCode;
    }

    var resultado;

    try {
        resultado = JSON.parse(resultadoRaw);
    } catch (e) {
        throw "Resposta invalida retornada pelo TAE. HTTP " +
            statusCode +
            ". Retorno: " +
            resultadoRaw;
    }

    if (statusCode != "200") {
        var erros = resultado.errors || [];
        for (var i = 0; i < erros.length; i++) {
            if (String(erros[i]).indexOf("destinat") !== -1 && String(erros[i]).indexOf("repetido") !== -1) {
                throw "Existem assinantes repetidos com o mesmo e-mail. " +
                    "Cada assinante precisa ter um e-mail diferente. " +
                    "Verifique a lista de assinantes antes de enviar.";
            }
        }

        throw "Erro na comunicacao com o TAE. HTTP " +
            statusCode +
            ". Retorno: " +
            JSON.stringify(resultado);
    }

    return resultado;
}

// OBTEM TOKEN
function ObterTokenTAE() {
    var ds = DatasetFactory.getDataset(
        "dsLoginTokenTAE",
        null,
        null,
        null
    );

    if (ds == null ||
        ds.values == null ||
        ds.values.length === 0) {

        log.error(
            "ObterTokenTAE - dsLoginTokenTAE nao retornou resultado."
        );

        throw "Nao foi possivel autenticar no TOTVS Assinatura Eletronica: " +
            "dsLoginTokenTAE vazio";
    }

    var melhorToken = null;
    var melhorExpiracao = null;

    for (var i = 0; i < ds.values.length; i++) {
        var tokenLinha = ds.getValue(i, "token");
        var expiracaoLinha = ds.getValue(i, "expirationDate");

        if (tokenLinha == null ||
            tokenLinha == "" ||
            String(tokenLinha).indexOf("ERRO") === 0) {
            continue;
        }

        var dataExpiracao = ConverteDataExpiracaoTAE(expiracaoLinha);

        if (dataExpiracao == null) {
            continue;
        }

        if (melhorExpiracao == null ||
            dataExpiracao.after(melhorExpiracao)) {

            melhorExpiracao = dataExpiracao;
            melhorToken = tokenLinha;
        }
    }

    if (melhorToken == null) {
        log.error(
            "ObterTokenTAE - Nenhum token valido entre as " +
            ds.values.length + " linhas do dataset."
        );

        throw "Nao foi possivel autenticar no TOTVS Assinatura Eletronica: " +
            "nenhum token valido no dataset";
    }

    if (melhorExpiracao.before(new java.util.Date())) {
        log.error(
            "ObterTokenTAE - Token expirado em " + melhorExpiracao
        );

        throw "Token do TOTVS Assinatura Eletronica expirado em " +
            melhorExpiracao +
            ". Sincronize o dataset dsLoginTokenTAE.";
    }

    log.info(
        "ObterTokenTAE - Token valido ate " + melhorExpiracao
    );

    return String(melhorToken);
}

function ConverteDataExpiracaoTAE(expiracao) {
    if (expiracao == null || expiracao == "") {
        return null;
    }

    var texto = String(expiracao);

    if (texto.length < 19) {
        return null;
    }

    try {
        var formato = new java.text.SimpleDateFormat(
            "yyyy-MM-dd'T'HH:mm:ss"
        );

        formato.setTimeZone(
            java.util.TimeZone.getTimeZone("UTC")
        );

        return formato.parse(texto.substring(0, 19));
    } catch (e) {
        log.warn(
            "ConverteDataExpiracaoTAE - Nao foi possivel interpretar: " + texto
        );
        return null;
    }
}

// UPLOAD DO DOCUMENTO
function UploadDocumentoTAE(docId, docName, token) {
    var files = JSON.stringify([{
        documentId: Number(docId),
        application: "application/pdf",
        fileName: String(docName)
    }]);

    var ds = DatasetFactory.getDataset(
        "dsTAEUploadArquivo",
        [
            files,
            token,
            String(docName),
            "https://totvssign.staging.totvs.app"
        ],
        null,
        null
    );

    if (ds == null ||
        ds.values == null ||
        ds.values.length === 0) {

        throw "Erro ao fazer upload do documento no TAE: " +
            "dsTAEUploadArquivo nao retornou resultado.";
    }

    var status = String(
        ds.getValue(0, "status")
    );

    var mensagem = ds.getValue(
        0,
        "mensagem"
    );

    if (status != "200") {
        throw "Erro ao fazer upload do documento no TAE: " +
            mensagem;
    }

    var detalhesRaw = ds.getValue(
        0,
        "detalhes"
    );

    if (detalhesRaw == null ||
        detalhesRaw == "") {

        throw "Erro ao fazer upload do documento no TAE: " +
            "campo detalhes nao retornado.";
    }

    var detalhes;

    try {
        detalhes = JSON.parse(
            detalhesRaw
        );
    } catch (e) {
        throw "Erro ao interpretar resposta do upload no TAE: " +
            detalhesRaw;
    }

    if (!detalhes.success ||
        detalhes.data == null) {

        throw "Erro ao fazer upload do documento no TAE: " +
            JSON.stringify(
                detalhes.errors ||
                detalhes.message
            );
    }

    return detalhes.data;
}

// CONSULTA ENVELOPE
function ConsultarEnvelopeTAE(idDocumento, token) {
    var ds = DatasetFactory.getDataset(
        "dsTAEEnvelopeInfo",
        null,
        [
            DatasetFactory.createConstraint(
                "envelopeId",
                String(idDocumento),
                String(idDocumento),
                ConstraintType.MUST
            ),

            DatasetFactory.createConstraint(
                "token",
                token,
                token,
                ConstraintType.MUST
            )
        ],
        null
    );

    if (ds == null ||
        ds.values == null ||
        ds.values.length === 0) {

        throw "Nao foi possivel consultar o envelope TAE " +
            "(idDocumento " +
            idDocumento +
            ")";
    }

    var dados = ds.getValue(
        0,
        "data"
    );

    var descricao = ds.getValue(
        0,
        "description"
    );

    if (dados == null ||
        dados == "" ||
        dados == "{}") {

        throw "Envelope TAE nao retornou dados: " +
            descricao;
    }

    try {
        return JSON.parse(dados);
    } catch (e) {
        throw "Erro ao interpretar os dados do envelope TAE: " +
            dados;
    }
}


// VERIFICA TIPO DE AUTENTICACAO
function VerificarTipoAutenticacaoTAE(email, token) {
    // 1 = usuario possui conta no TAE
    // 2 = usuario nao possui conta e utiliza codigo por e-mail
    if (email == null || email == "") {
        throw "Nao foi possivel verificar autenticacao TAE: " +
            "e-mail nao informado.";
    }

    var endpoint =
        "/signintegration/v2/Usuarios/email-list?Filter=" +
        encodeURIComponent(email) +
        "&Take=10";

    var json = ChamarTAE(
        endpoint,
        "GET",
        token,
        null
    );

    if (!json.success) {
        throw "Erro ao verificar cadastro no TAE do destinatario " +
            email +
            ": " +
            (json.message ||
                JSON.stringify(json.errors));
    }

    var possuiConta =
        json.data != null &&
        json.data.length > 0;

    return possuiConta ? 1 : 2;
}

// PUBLICA ENVELOPE
function PublicarEnvelopeTAE(
    idDocumento,
    jsonSigner,
    token
) {
    var signatarios;

    try {
        signatarios = JSON.parse(
            jsonSigner
        );
    } catch (e) {
        throw "jsonSigner invalido: " +
            jsonSigner;
    }

    if (signatarios == null ||
        signatarios.length === 0) {

        throw "Nenhum destinatario informado (jsonSigner vazio)";
    }

    var destinatarios = [];

    for (var i = 0; i < signatarios.length; i++) {
        var signatario = signatarios[i];

        if (signatario == null) {
            throw "Destinatario " +
                (i + 1) +
                " invalido.";
        }

        if (signatario.email == null ||
            signatario.email == "") {

            throw "Destinatario " +
                (i + 1) +
                " sem e-mail.";
        }

        if (signatario.nome == null ||
            signatario.nome == "") {

            throw "Destinatario " +
                (i + 1) +
                " sem nome.";
        }

        if (signatario.cpf == null ||
            signatario.cpf == "") {

            throw "Destinatario " +
                (i + 1) +
                " sem CPF/CNPJ.";
        }

        var tipoAutenticacao =
            VerificarTipoAutenticacaoTAE(
                signatario.email,
                token
            );

        destinatarios.push({
            email: signatario.email,

            // 0 = assinar
            acao: 0,

            workflow: 1,

            papelAssinante: "como assinante",

            nomeCompleto: signatario.nome,

            tipoAutenticacao: tipoAutenticacao,

            // 1 = CPF/CNPJ
            tipoIdentificacao: 1,

            identificacao: signatario.cpf,

            notificaEnvio: true,

            // 1 = e-mail
            tipoEnvioDocumento: 1,

            // 1 = e-mail
            // Somente quando autenticacao = 2
            tipoEnvioCodigo:
                tipoAutenticacao == 2 ? 1 : null,

            telefone: null
        });
    }

    var corpo = {
        idDocumento: Number(idDocumento),

        utilizaWorkflow: false,

        destinatarios: destinatarios,

        observadores: [],

        publicacaoOpcoes: {
            dataExpiracao: null,

            solicitaAssinaturaManuscrita: false,

            assuntoMensagem: "",

            corpoMensagem: "",

            permiteRejeitarDocumento: true,

            intervaloLembrete: 0
        }
    };

    var resposta = ChamarTAE(
        "/documents/v1/publicacoes",
        "POST",
        token,
        corpo
    );

    if (!resposta.success) {
        throw "Erro ao publicar envelope no TAE: " +
            JSON.stringify(
                resposta.errors ||
                resposta.message ||
                resposta
            );
    }

    return resposta;
}

// ANEXA DOCUMENTO
function AnexarDocumento(idDocumento) {
    var attachments = hAPI.listAttachments();

    for (var i = 0; i < attachments.size(); i++) {
        var documentoAnexado =
            attachments
                .get(i)
                .getDocumentId();

        if (Number(idDocumento) ==
            Number(documentoAnexado)) {

            return;
        }
    }

    hAPI.attachDocument(
        idDocumento
    );
}

// HISTORICO
function RegistraHistorico(atividade) {
    // Salvou sem avancar no fluxo: nao e movimentacao, nao registra
    if (getValue("WKCompletTask") != "true") {
        return;
    }

    if (atividade == "0" || atividade == "4") {
        InsereHistorico("Início", "Enviado");
    }
    else if (atividade == "5") {
        InsereHistorico("Aprovação", hAPI.getCardValue("hiddenAprovacao") || "Avaliado");
    }
    else if (atividade == "23") {
        InsereHistorico("Assinatura", "Encerrado");
    }
    else {
        log.info("RegistraHistorico - Estado " + atividade + " sem historico.");
    }
}

// As chaves batem com as classes/names dos inputs da #tableHistorico no formulario
function InsereHistorico(atividade, acao) {
    var observacao = (hAPI.getCardValue("motivo") || "").trim();

    if (observacao == "") {
        observacao = "Etapa concluída sem observações adicionais.";
    }

    var linha = new java.util.HashMap();

    linha.put("tableHistoricoUsuario", "" + getValue("WKUser"));
    linha.put("tableHistoricoData", "" + DataHoraAtual());
    linha.put("tableHistoricoAtividade", "" + atividade);
    linha.put("tableHistoricoObservacao", "" + observacao);
    linha.put("tableHistoricoAcao", "" + acao);

    hAPI.addCardChild("tableHistorico", linha);

    // Limpa para a proxima etapa nao herdar o texto da anterior
    hAPI.setCardValue("motivo", "");

    log.info("InsereHistorico - " + atividade + " / " + acao);
}

function DataHoraAtual() {
    return new java.text.SimpleDateFormat("yyyy-MM-dd HH:mm:ss").format(new java.util.Date());
}