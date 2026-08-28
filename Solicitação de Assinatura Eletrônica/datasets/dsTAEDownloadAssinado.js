function defineStructure() {
    addColumn("url");
}

function createDataset(fields, constraints, sortFields) {
    var parametros = leParametros(constraints);

    try {
        var url = buscarUrlDocumentoAssinado(parametros.envelopeId, parametros.token);

        log.info("dsTAEDownloadAssinado - URL obtida para o envelope " + parametros.envelopeId);

        return returnDataset(url);
    } catch (error) {
        var mensagem = extraiMensagemErro(error);
        log.error("dsTAEDownloadAssinado - Falha ao obter a URL: " + mensagem);

        return returnDataset("");
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


function buscarUrlDocumentoAssinado(envelopeId, token) {
    var clientService = fluigAPI.getAuthorizeClientService();

    var requisicao = {
        companyId: "1",
        serviceCode: "TAE",
        endpoint: "/documents/v2/publicacoes/" + envelopeId + "/download?tipoDownload=2",
        method: "GET",
        timeoutService: "200",
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
        throw "Erro ao obter o documento assinado do envelope " + envelopeId +
            " (status " + statusCode + "): " + JSON.stringify(json.errors || json);
    }

    var url = extraiUrl(json.data);

    if (url == "") {
        throw "TAE nao retornou a URL do documento assinado. Retorno: " + corpo;
    }

    return url;
}

function extraiUrl(data) {
    if (data == null) return "";
    if (typeof data == "string") return data;

    return String(data.fileUrl || data.url || data.signedURL || "");
}

// Utils
function returnDataset(url) {
    var dataset = DatasetBuilder.newDataset();
    dataset.addColumn("url");
    dataset.addRow([url]);
    return dataset;
}

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
