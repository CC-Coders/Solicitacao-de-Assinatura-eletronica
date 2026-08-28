function defineStructure() {
    addColumn("email");
    addColumn("link");
}

function createDataset(fields, constraints, sortFields) {
    var parametros = leParametros(constraints);

    try {
        var destinatarios = buscarDestinatariosTAE(parametros.envelopeId, parametros.token);

        var dataset = DatasetBuilder.newDataset();
        dataset.addColumn("email");
        dataset.addColumn("link");

        for (var i = 0; i < destinatarios.length; i++) {
            var destinatario = destinatarios[i];
            dataset.addRow([
                String(destinatario.email),
                montaLinkAssinatura(parametros.envelopeId, destinatario.publicKey)
            ]);
        }

        log.info("dsTAELinksAssinantes - " + destinatarios.length +
            " destinatario(s) do envelope " + parametros.envelopeId);

        return dataset;
    } catch (error) {
        var mensagem = extraiMensagemErro(error);
        log.error("dsTAELinksAssinantes - Falha ao obter os links: " + mensagem);

        var vazio = DatasetBuilder.newDataset();
        vazio.addColumn("email");
        vazio.addColumn("link");
        return vazio;
    }
}

function leParametros(constraints) {
    var valores = {};

    if (constraints != null) {
        for (var i = 0; i < constraints.length; i++) {
            valores[String(constraints[i].fieldName)] = String(constraints[i].initialValue);
        }
    }

    if (!valores.envelopeId) {
        throw "envelopeId nao informado";
    }
    if (!valores.token) {
        throw "token nao informado";
    }

    return valores;
}


function buscarDestinatariosTAE(envelopeId, token) {
    var clientService = fluigAPI.getAuthorizeClientService();

    var requisicao = {
        companyId: "1",
        serviceCode: "TAE",
        endpoint: "/documents/v1/publicacoes/" + envelopeId + "/destinatarios",
        method: "POST",
        timeoutService: "200",
        params: {},
        headers: {
            "Content-Type": "application/json",
            "Authorization": "Bearer " + token,
            "Accept": "application/json"
        }
    };

    var volta = clientService.invoke(JSON.stringify(requisicao));
    var statusCode = String(volta.getHttpStatusResult());
    var corpo = String(volta.getResult());

    var json;
    try {
        json = JSON.parse(corpo);
    } catch (e) {
        throw "TAE retornou resposta nao-JSON (status " + statusCode + "): " + corpo;
    }

    if (statusCode != "200" || json.success != true) {
        throw "Erro ao consultar destinatarios do envelope " + envelopeId +
            " (status " + statusCode + "): " + JSON.stringify(json.errors || json);
    }

    return json.data || [];
}


function montaLinkAssinatura(envelopeId, publicKey) {
    var chave = String(publicKey || "");

    if (chave == "" || chave == "00000000-0000-0000-0000-000000000000") {
        return URL_PORTAL_TAE + "/webapptotvssign/documents/" + envelopeId;
    }

    return URL_PORTAL_TAE + "/webapptotvssign/auth/verification-access/" + chave;
}

var URL_PORTAL_TAE = "https://totvssign.staging.totvs.app";

// Utils
function extraiMensagemErro(error) {
    if (error == null) return "Erro desconhecido";
    if (typeof error == "string") return error;
    try {
        if (error.javaException != null) {
            return String(error.javaException.getMessage() != null
                ? error.javaException.getMessage() : error.javaException.toString());
        }
        if (error.rhinoException != null && error.rhinoException.getMessage() != null) {
            return String(error.rhinoException.getMessage());
        }
        if (error.message != null && error.message != "") return String(error.message);
        return String(error);
    } catch (erroInterno) {
        return "Erro desconhecido (falha ao extrair mensagem do erro original)";
    }
}
