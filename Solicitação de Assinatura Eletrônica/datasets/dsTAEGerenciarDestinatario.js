function defineStructure() {
    addColumn("STATUS");
    addColumn("MENSAGEM");
}

function createDataset(fields, constraints, sortFields) {
    var parametros = leParametros(constraints);

    var dataset = DatasetBuilder.newDataset();
    dataset.addColumn("STATUS");
    dataset.addColumn("MENSAGEM");

    try {
        if (parametros.acao == "adicionar") {
            AdicionarDestinatario(parametros);
        } else if (parametros.acao == "remover") {
            RemoverDestinatario(parametros);
        } else {
            throw "acao invalida (use 'adicionar' ou 'remover'): " + parametros.acao;
        }

        dataset.addRow(["SUCCESS", ""]);
    } catch (error) {
        var mensagem = extraiMensagemErro(error);
        log.error("dsTAEGerenciarDestinatario - Falha: " + mensagem);
        dataset.addRow(["ERRO", mensagem]);
    }

    return dataset;
}

function leParametros(constraints) {
    var valores = {};

    if (constraints != null) {
        for (var i = 0; i < constraints.length; i++) {
            valores[String(constraints[i].fieldName)] = String(constraints[i].initialValue);
        }
    }

    if (!valores.envelopeId) throw "envelopeId nao informado";
    if (!valores.token) throw "token nao informado";
    if (!valores.acao) throw "acao nao informada";

    return valores;
}

function AdicionarDestinatario(parametros) {
    if (!parametros.email) throw "email nao informado";
    if (!parametros.nome) throw "nome nao informado";
    if (!parametros.cpf) throw "cpf nao informado";

    var tipoAutenticacao = VerificarTipoAutenticacaoTAE(parametros.email, parametros.token);

    var corpo = {
        idDocumento: Number(parametros.envelopeId),
        destinatarios: [{
            email: parametros.email,
            acao: 0, // assinar
            workflow: 1,
            papelAssinante: "como assinante",
            nomeCompleto: parametros.nome,
            tipoAutenticacao: tipoAutenticacao,
            tipoIdentificacao: 1, // CPF/CNPJ
            identificacao: parametros.cpf,
            notificaEnvio: true,
            tipoEnvioDocumento: 1, // e-mail
            tipoEnvioCodigo: tipoAutenticacao == 2 ? 1 : null,
            telefone: null
        }]
    };

    ChamarTAE(
        "/signintegration/v2/Publicacoes/destinatario-list",
        "POST",
        parametros.token,
        corpo
    );
}

function RemoverDestinatario(parametros) {
    if (!parametros.email) throw "email nao informado";

    var corpo = {
        idDocumento: Number(parametros.envelopeId),
        emailDestinatario: parametros.email
    };

    // O clientService.invoke() do Fluig nao envia body em requisicoes DELETE
    // (nem via params, nem via query string). O TAE exige body nesse
    // endpoint, entao chamamos via HttpURLConnection puro, forcando
    // setDoOutput(true) antes de escrever o JSON.
    ChamarTAEComBodyEmDelete(
        "/signintegration/v2/Publicacoes/destinatario",
        parametros.token,
        corpo
    );
}

function ChamarTAEComBodyEmDelete(endpoint, token, corpo) {
    var conn = null;
    try {
        var url = new java.net.URL(URL_BASE_TAE + endpoint);
        conn = url.openConnection();
        conn.setRequestMethod("DELETE");
        conn.setDoOutput(true);
        conn.setRequestProperty("Content-Type", "application/json");
        conn.setRequestProperty("Authorization", "Bearer " + token);
        conn.setRequestProperty("Accept", "application/json");

        var bytes = new java.lang.String(JSON.stringify(corpo)).getBytes("UTF-8");
        var out = conn.getOutputStream();
        out.write(bytes);
        out.flush();
        out.close();

        var statusCode = conn.getResponseCode();
        var stream = statusCode >= 200 && statusCode < 300 ? conn.getInputStream() : conn.getErrorStream();
        var resposta = LeStream(stream);

        var json;
        try {
            json = JSON.parse(resposta);
        } catch (e) {
            throw "TAE retornou resposta nao-JSON (status " + statusCode + "): " + resposta;
        }

        if (statusCode < 200 || statusCode >= 300) {
            throw "Erro na comunicacao com o TAE. HTTP " + statusCode + ". Retorno: " + JSON.stringify(json);
        }

        return json;
    } finally {
        if (conn != null) conn.disconnect();
    }
}

function LeStream(stream) {
    var reader = new java.io.BufferedReader(new java.io.InputStreamReader(stream, "UTF-8"));
    var linha;
    var texto = "";
    while ((linha = reader.readLine()) != null) {
        texto += linha;
    }
    reader.close();
    return texto;
}

var URL_BASE_TAE = "https://totvssign.staging.totvs.app";

// Mesma logica do beforeTaskSave: 1 = ja tem conta no TAE (login), 2 = codigo por e-mail
function VerificarTipoAutenticacaoTAE(email, token) {
    var endpoint = "/signintegration/v2/Usuarios/email-list?Filter=" + encodeURIComponent(email) + "&Take=10";
    var json = ChamarTAE(endpoint, "GET", token, null);

    if (!json.success) {
        throw "Erro ao verificar cadastro no TAE do destinatario " + email + ": " +
            (json.message || JSON.stringify(json.errors));
    }

    var emailBuscado = String(email).toLowerCase();
    var possuiConta = false;

    if (json.data != null) {
        for (var i = 0; i < json.data.length; i++) {
            var emailEncontrado = String(json.data[i].email || "").toLowerCase();
            if (emailEncontrado == emailBuscado) {
                possuiConta = true;
                break;
            }
        }
    }

    return possuiConta ? 1 : 2;
}

function ChamarTAE(endpoint, method, token, params) {
    var clientService = fluigAPI.getAuthorizeClientService();

    var requisicao = {
        companyId: "1",
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

    var volta = clientService.invoke(JSON.stringify(requisicao));
    var statusCode = String(volta.getHttpStatusResult());
    var corpo = String(volta.getResult());

    var json;
    try {
        json = JSON.parse(corpo);
    } catch (e) {
        throw "TAE retornou resposta nao-JSON (status " + statusCode + "): " + corpo;
    }

    if (statusCode != "200" && statusCode != "204") {
        throw "Erro na comunicacao com o TAE. HTTP " + statusCode + ". Retorno: " + JSON.stringify(json);
    }

    return json;
}

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
