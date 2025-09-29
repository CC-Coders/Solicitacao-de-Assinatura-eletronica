ModalNovoAssinante = null;
ModalAssinantes = null;

function criaDocNoFluig(file) {
    return new Promise((resolve, reject) => {
        var reader = new FileReader();
        reader.onload = function () {
            var bytes = reader.result.split("base64,")[1];
            var nomeArquivo = file.name;

            DatasetFactory.getDataset("CriacaoDocumentosFluig", null, [
                DatasetFactory.createConstraint("conteudo", bytes, bytes, ConstraintType.MUST),
                DatasetFactory.createConstraint("nome", nomeArquivo, nomeArquivo, ConstraintType.SHOULD),
                DatasetFactory.createConstraint("descricao", nomeArquivo, nomeArquivo, ConstraintType.SHOULD),
                DatasetFactory.createConstraint("pasta", 655172, 655172, ConstraintType.SHOULD)
            ], null, {
                success: (res => {
                    if (!res || res == "" || res == null) {
                        FLUIGC.toast({
                            title: "Houve um erro na comunicação com o webservice de criação de documentos. Tente novamente!",
                            message: "",
                            type: "warning"
                        });
                        console.error("Houve um erro na comunicação com o webservice de criação de documentos. Tente novamente!");
                        reject();
                    }
                    else {
                        if (res.values[0][0] == "false") {
                            FLUIGC.toast({
                                title: "Erro ao criar arquivo. Favor entrar em contato com o administrador do sistema. Mensagem: " + res.values[0][1],
                                message: "",
                                type: "warning"
                            });
                            console.error("Erro ao criar arquivo. Favor entrar em contato com o administrador do sistema. Mensagem: " + res.values[0][1]);
                            reject();
                        }
                        else {
                            console.log("### GEROU docID = " + res.values[0].Resultado);
                            resolve([res.values[0].Resultado, nomeArquivo]);
                        }
                    }
                })
            });
        };

        reader.readAsDataURL(file);
    });
}

function AbreModalNovoAssinante(onCadastrarAssinante) {
    ModalNovoAssinante = FLUIGC.modal({
        title: 'Cadastrar Novo Assinante',
        content: '<div id="rootNovoAssinante"></div>',
        id: 'ModalNovoAssinante',
        size: 'full',
        actions: [{
            'label': 'Cadastrar Assinante',
            "classType": "btn-success",
            'bind': 'btn-Criar-Novo-Assinante',
        }, {
            'label': 'Cancelar',
            'autoClose': true
        }]
    }, function (err, data) {
        if (err) {
            // do error handling
        } else {
            ReactDOM.render(React.createElement(CadastroNovoAssinante, { onCadastrarAssinante: onCadastrarAssinante }), document.querySelector('#rootNovoAssinante'));
        }
    });
}

function validaEmail(email) {
    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailPattern.test(email);
}

function CadastraAssinante(nome, email, cpf) {
    return new Promise((resolve, reject) => {
        var ds = DatasetFactory.getDataset('ds_auxiliar_wesign', null, [
            DatasetFactory.createConstraint("nome", nome, nome, ConstraintType.MUST),
            DatasetFactory.createConstraint("email", email, email, ConstraintType.MUST),
            DatasetFactory.createConstraint("cEmail", email, email, ConstraintType.MUST),
            DatasetFactory.createConstraint("tipo", "E", "E", ConstraintType.MUST),
            DatasetFactory.createConstraint("cpf", cpf, cpf, ConstraintType.MUST),
            DatasetFactory.createConstraint("cCpf", cpf, cpf, ConstraintType.MUST),
            DatasetFactory.createConstraint("titulo", "", "", ConstraintType.MUST),
            DatasetFactory.createConstraint("empresa", "", "", ConstraintType.MUST),
            DatasetFactory.createConstraint("metodo", "createSigner", "createSigner", ConstraintType.MUST)
        ], null);

        if (ds.values[0].Result == "OK") {
            resolve();
        }
        else {
            reject();
        }

    });
}

function VerificaSeSolicitanteAprovadorDeAssinatura() {
    DatasetFactory.getDataset("workflowColleagueRole", null, [
        DatasetFactory.createConstraint("colleagueId", $("#solicitante").val(), $("#solicitante").val(), ConstraintType.MUST),
        DatasetFactory.createConstraint("roleId", "aprovaAssinaturasE", "aprovaAssinaturasE", ConstraintType.MUST)
    ], null, {
        success: (ds => {
            if (ds.values.length > 0) {
                $("#SolicitanteAprovaSolicitacao").val("true");
            } else {
                $("#SolicitanteAprovaSolicitacao").val("false");
            }
        })
    })
}

function ValidaAntesDeEnviar() {
    if ($("#atividade").val() == 0 || $("#atividade").val() == 4) {
        if ($("#docId").val() == "") {
            FLUIGC.toast({
                title: "Documento não Anexado!",
                message: "",
                type: "warning"
            })

            return false;
        } else if ($("#jsonSigner").val() == "" || $("#jsonSigner").val() == "[]") {
            FLUIGC.toast({
                title: "Nenhum Assinante Inserido!",
                message: "",
                type: "warning"
            })

            return false;
        }
    } else if ($("#atividade").val() == 5) {
        if ($("#hiddenAprovacao").val() == "") {
            FLUIGC.toast({
                title: "Nenhuma Decisão Selecionada!",
                message: "",
                type: "warning"
            })

            return false;
        }
    }

    return true;
}

function hex2a(hexx) {
    var hex = hexx.toString();
    var str = '';
    for (var i = 0;
        (i < hex.length && hex.substr(i, 2) !== '00'); i += 2)
        str += String.fromCharCode(parseInt(hex.substr(i, 2), 16));
    return str;
}