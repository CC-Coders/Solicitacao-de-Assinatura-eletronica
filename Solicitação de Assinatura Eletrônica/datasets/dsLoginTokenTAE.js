function defineStructure() {
    addColumn("token");
    addColumn("expirationDate");
}

function createDataset(fields, constraints, sortFields) {
    try {
        var resultado = realizarLoginTAE();

        log.info("dsLoginTokenTAE - Login realizado com sucesso. Expira em: " + resultado.expirationDate);

        return returnDataset(resultado.token, resultado.expirationDate);
    } catch (error) {
        var mensagem = extraiMensagemErro(error);
        log.error("dsLoginTokenTAE - Falha ao obter token: " + mensagem);
       
        return returnDataset("ERRO", mensagem);
    }
}


function onSync(lastSyncDate) {
    return createDataset(null, null, null);
}


function buscarCredenciaisTAE() {
    var dataset = DatasetFactory.getDataset("dsUserAdmTAE", null, null, null);
    if (dataset == null || dataset.values == null || dataset.values.length === 0) {
        throw "Nao foi possivel obter as credenciais do TAE (dsUserAdmTAE vazio)";
    }
    return {
        usuario: String(dataset.getValue(0, "USUARIO")),
        senha: String(dataset.getValue(0, "SENHA"))
    };
}

function realizarLoginTAE() {
    var credenciais = buscarCredenciaisTAE();
    var json = chamarLoginTAE(credenciais.usuario, credenciais.senha);

    return {
        token: json.data.token,
        expirationDate: json.data.expirationDate
    };
}


function chamarLoginTAE(usuario, senha) {
    var clientService = fluigAPI.getAuthorizeClientService();

    var requisicao = {
        companyId: "1",
        serviceCode: "TAE",
        endpoint: "/identityintegration/v3/auth/login",
        timeoutService: "200",
        method: "POST",
        params: { userName: String(usuario), password: String(senha) }
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

    if (statusCode != "200" || json.succeeded != true) {
        var mensagem = json.description
            || (json.messages && json.messages[0] && json.messages[0].description)
            || "Erro desconhecido ao autenticar no TAE";
        throw "Falha na autenticacao no TAE (status " + statusCode + "): " + mensagem;
    }

    return json;
}

// Utils
function returnDataset(token, expirationDate) {
    var dataset = DatasetBuilder.newDataset();
    dataset.addColumn("token");
    dataset.addColumn("expirationDate");
    dataset.addRow([token, expirationDate]);
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
