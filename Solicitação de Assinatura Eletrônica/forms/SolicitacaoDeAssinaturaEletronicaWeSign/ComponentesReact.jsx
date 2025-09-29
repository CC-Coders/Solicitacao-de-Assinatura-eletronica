const useEffect = React.useEffect;
const useState = React.useState;
const useCallback = React.useCallback;
const Select = antd.Select;

function AppRoot() {
    const [Assinantes, setAssinantes] = useState([]);
    const [listAssinantes, setlistAssinantes] = useState([]);
    const [RadioAprovacao, setRadioAprovacao] = useState("");

    useEffect(async () => {
        setlistAssinantes(await BuscaListaAssinantes());
        var signers = $("#jsonSigner").val();
        if (signers) {
            setAssinantes(JSON.parse(signers));
        }
    }, []);

    function verificaSeAssinanteJaCadastrado(Cpf) {
        var found = listAssinantes.find((e) => e.Cpf == Cpf);
        if (found) {
            return true;
        } else {
            return false;
        }
    }

    var valorSolicitanteAprova = document.getElementById("SolicitanteAprovaSolicitacao").value;
console.log("Valor de SolicitanteAprovaSolicitacao:", valorSolicitanteAprova);

    function BuscaListaAssinantes() {
        return new Promise((resolve, reject) => {
            DatasetFactory.getDataset("ds_wesign_assinantes", null, [], null, {
                success: (ds) => {                   

                    var assinantes = [];
                    for (const assinante of ds.values) {
                      // console.log("Assinante encontrado:", assinante);
                        assinantes.push({
                            Nome: assinante.nome,
                            Email: hex2a(assinante.email),
                            Cpf: hex2a(assinante.cpf)
                        });
                    }
                    console.log("Lista de assinantes:", assinantes); 
                    resolve(assinantes);
                },
                error: (err) => {
                console.error("Erro ao carregar assinantes:", err); // Logar erros, se ocorrerem
                reject(err);
            }
            });
        });
    }

    function handleChangeInputAprovacao(value) {
        setRadioAprovacao(value);
        $("#hiddenAprovacao").val(value);
    }

    function handleAdicionarAssinantes(assinante) {
        var nextAssinantes = Assinantes.slice();
        assinante = assinante.split(" | ");
        console.log("Dados inseridos:", assinante);
        if (assinante[0] == "" || assinante[1] == "" || assinante[2] == "") {
            FLUIGC.toast({
                title: "Assinante inválido!",
                message: "",
                type: "warning"
            });
        } else {
            assinante = {
                nome: assinante[0],
                email: assinante[1],
                cpf: assinante[2],
                tipo: "E",
                status: "Pendente"
            };
            //Verifica se o assinante ja esta na Lista de Assinantes
            var found = Assinantes.find((e) => e.cpf == assinante.cpf);

            if (!found) {
                //Caso não esteja insere o assinante na Lista
                nextAssinantes.push(assinante);
                setAssinantes(nextAssinantes);
                $("#jsonSigner").val(JSON.stringify(nextAssinantes));
            } else {
                //Caso esteja informa que o assinante já está incluido
                FLUIGC.toast({
                    title: "Assinante já incluido!",
                    message: "",
                    type: "warning"
                });
            }
        }
    }

    function handleExcluirAssinante(cpf) {
        var nextAssinantes = Assinantes.slice();
        nextAssinantes = nextAssinantes.filter((Assinante) => Assinante.cpf != cpf);
        $("#jsonSigner").val(JSON.stringify(nextAssinantes));
        setAssinantes(nextAssinantes);
    }

    function handleCadastrarAssinante(e) {
        if (false || verificaSeAssinanteJaCadastrado(e.Cpf)) {
            // Incluí false na condição para permitir cadastrar CPF repetido para usuário que assinam com E-mail Castilho, Dromos e Epya
            FLUIGC.toast({
                title: "CPF já Cadastrado!",
                message: "",
                type: "warning"
            });
        } else {
            CadastraAssinante(e.Nome, e.Email, e.Cpf)
                .then(async () => {
                    FLUIGC.toast({
                        title: "Assinante Cadastrado com Sucesso!",
                        message: "",
                        type: "success"
                    });
                    setlistAssinantes(await BuscaListaAssinantes());
                })
                .catch(() => {
                    FLUIGC.toast({
                        title: "Erro ao Cadastrar Assinante!",
                        message: "",
                        type: "warning"
                    });
                });
        }
    }

    function renderOptionsAssinantes() {
        var options = [];
        for (const assinante of listAssinantes) {
            options.push({
                value: assinante.Nome + " | " + assinante.Email + " | " + assinante.Cpf,
                label: assinante.Nome + " | " + assinante.Email + " | " + assinante.Cpf
            });
        }

        return options;
    }

    return (
        <>
            <div className="panel panel-primary">
                <div className="panel-heading">
                    <h3 className="panel-title">Assinatura Eletrônica</h3>
                </div>
                <div className="panel-body">
                    <div className="row">
                        <div className="col-md-6">
                            <AnexadorDeDocumentos />
                        </div>
                        <div className="col-md-6">
                            <SelecionadorDeAssinantes Assinantes={Assinantes} onAdicionarAssinante={(assinante) => handleAdicionarAssinantes(assinante)} onExcluirAssinante={(e) => handleExcluirAssinante(e)} onCadastrarAssinante={(e) => handleCadastrarAssinante(e)} listaAssinantes={renderOptionsAssinantes()} />
                            <br />
                        </div>
                    </div>
                </div>
            </div>
            <br />

             {$("#atividade").val() == "5" && (
                <div className="panel panel-primary">
                    <div className="panel-heading">
                        <h3 className="panel-title">Aprovação</h3>
                    </div>
                    <div className="panel-body">
                        <div style={{ textAlign: "center" }}>
                            <label htmlFor="radioAprovar">
                                <input type="radio" name="radioAprovacao" id="radioAprovar" value={"Aprovar"} checked={RadioAprovacao == "Aprovar"} onChange={() => handleChangeInputAprovacao("Aprovar")} />
                                Aprovar
                            </label>
                            <label htmlFor="radioRetornar" style={{ marginLeft: "20px", marginRight: "20px" }}>
                                <input type="radio" name="radioAprovacao" id="radioRetornar" value={"Retornar"} checked={RadioAprovacao == "Retornar"} onChange={() => handleChangeInputAprovacao("Retornar")} />
                                Retornar
                            </label>
                            <label htmlFor="radioCancelar">
                                <input type="radio" name="radioAprovacao" id="radioCancelar" value={"Cancelar"} checked={RadioAprovacao == "Cancelar"} onChange={() => handleChangeInputAprovacao("Cancelar")} />
                                Cancelar
                            </label>
                        </div>
                    </div>
                </div>
            )}
            <br />
            {$("#atividade").val() == "23" && <AssinaturaEletronica NomeArquivo={"Teste.pdf"} ChaveArquivo={"28956748941894894894"} DataEnvio={"19/04/2023"} HorarioEnvio={"14:23"} Status={"Pendente Assinatura"} />}
        </>
    );
}

function AnexadorDeDocumentos() {
    const [DescricaoDocumento, setDescricaoDocumento] = useState("");

    useEffect(() => {
        setDescricaoDocumento($("#docName").val());
    }, []);

    function handleOnChangeFile(e) {
        setDescricaoDocumento("Carregando.....");
        criaDocNoFluig(e.target.files[0])
            .then((result) => {
                console.log();
                $("#docId").val(result[0]);
                $("#docName").val(result[1]);
                setDescricaoDocumento(result[1]);
            })
            .catch();
    }

    return (
        <div>
            <label htmlFor="">Selecione o Documento: </label>
            <br />
            {($("#atividade").val() == "0" || $("#atividade").val() == "4") && (
                <a className="file-input-wrapper btn btn-primary">
                    <i className="flaticon flaticon-upload icon-sm"></i>
                    <span>Publicar documento</span>
                    <input type="file" className="btn btn-default btn-sm btn-block" title="Carregar documentos" onChange={(e) => handleOnChangeFile(e)} />
                </a>
            )}

            <span style={{ marginLeft: "10px" }}>{DescricaoDocumento}</span>
        </div>
    );
}

function Assinante({ nome, email, cpf, onExcluirAssinante }) {
    return (
        <div className="card" style={{ borderColor: "gray" }}>
            <div className="card-body">
                <h3 className="card-title">{nome}</h3>
                <p className="card-text">{email}</p>
                <p className="card-text">{cpf}</p>
                {($("#atividade").val() == "0" || $("#atividade").val() == "4") && (
                    <button className="btn btn-danger" onClick={() => onExcluirAssinante(cpf)}>
                        Remover <i className="flaticon flaticon-trash icon-sm" aria-hidden="true"></i>
                    </button>
                )}
            </div>
        </div>
    );
}

function SelecionadorDeAssinantes({ Assinantes, onAdicionarAssinante, onExcluirAssinante, onCadastrarAssinante, listaAssinantes }) {
    const [AssinanteSelecionado, setAssinanteSelecionado] = useState("");

    function renderListaAssinantes() {
        var ListAssinantes = Assinantes.map((assinante) => <Assinante key={assinante.cpf} nome={assinante.nome} email={assinante.email} cpf={assinante.cpf} onExcluirAssinante={(e) => onExcluirAssinante(e)} />);
        return ListAssinantes;
    }

    return (
        <div>
            <label htmlFor="">Selecione o Assinante: </label>
            {($("#atividade").val() == "0" || $("#atividade").val() == "4") && (
                <div style={{ display: "flex", alignItems: "center" }}>
                    <Select style={{ width: "100%" }} options={listaAssinantes} value={AssinanteSelecionado} onChange={(e) => setAssinanteSelecionado(e)} filterOption={(input, option) => (option?.label ?? "").toLowerCase().includes(input.toLowerCase())} showSearch />
                    <button
                        className="btn btn-success"
                        onClick={(e) => {
                            onAdicionarAssinante(AssinanteSelecionado);
                            setAssinanteSelecionado("");
                        }}
                    >
                        Selecionar
                    </button>
                    <button className="btn btn-info" onClick={() => AbreModalNovoAssinante(onCadastrarAssinante)}>
                        Cadastrar Novo
                    </button>
                </div>
            )}
            <br />

            {renderListaAssinantes()}
        </div>
    );
}

class CadastroNovoAssinante extends React.Component {
    constructor(props) {
        super(props);

        this.state = {
            Nome: "",
            Email: "",
            Cpf: ""
        };

        this.handleCriaAssinante = this.handleCriaAssinante.bind(this);
    }

    componentDidMount() {
        $("[btn-criar-novo-assinante]").on("click", { onCriaAssinante: this.handleCriaAssinante }, function (e) {
            e.data.onCriaAssinante();
        });
    }

    handleCriaAssinante() {
        if (this.state.Nome == "") {
            FLUIGC.toast({
                title: "Nome do Assinante não preenchido!",
                message: "",
                type: "warning"
            });
        } else if (this.state.Email == "") {
            FLUIGC.toast({
                title: "E-mail do Assinante não preenchido!",
                message: "",
                type: "warning"
            });
        } else if (!validaEmail(this.state.Email)) {
            FLUIGC.toast({
                title: "E-mail inválido!",
                message: "",
                type: "warning"
            });
        } else if (this.state.Cpf == "") {
            FLUIGC.toast({
                title: "CPF do Assinante não preenchido!",
                message: "",
                type: "warning"
            });
        } else {
            console.log("Cadastrar");
            this.props.onCadastrarAssinante({
                Nome: this.state.Nome.trim(),
                Email: this.state.Email.trim(),
                Cpf: this.state.Cpf
            });
            ModalNovoAssinante.remove();
        }
    }

    render() {
        return (
            <div>
                <div>
                    <label>Nome:</label>
                    <input type="text" className="form-control" value={this.state.Nome} onChange={(e) => this.setState({ Nome: e.target.value })} />
                </div>
                <br />
                <div>
                    <label>E-mail:</label>
                    <input type="text" className="form-control" value={this.state.Email} onChange={(e) => this.setState({ Email: e.target.value })} />
                </div>
                <br />
                <div>
                    <label>CPF:</label>
                    <CpfInput onChange={(e) => this.setState({ Cpf: e })} value={this.state.Cpf} />
                </div>
            </div>
        );
    }
}

function CpfInput({ onChange, value }) {
    const handleCpfChange = (event) => {
        let value = event.target.value.replace(/\D/g, "");

        if (value.length > 11) {
            value = value.slice(0, 11);
        }

        value = value
            .replace(/(\d{3})(\d)/, "$1.$2")
            .replace(/(\d{3})(\d)/, "$1.$2")
            .replace(/(\d{3})(\d{1,2})$/, "$1-$2");

        onChange(value);
    };

    const validateCpf = (value) => {
        const cleanCpf = value.replace(/\D/g, "");

        if (cleanCpf.length !== 11) {
            return false;
        }

        let sum = 0;
        let rest;

        for (let i = 1; i <= 9; i++) {
            sum += parseInt(cleanCpf.substring(i - 1, i)) * (11 - i);
        }

        rest = (sum * 10) % 11;

        if (rest === 10 || rest === 11) {
            rest = 0;
        }

        if (rest !== parseInt(cleanCpf.substring(9, 10))) {
            return false;
        }

        sum = 0;

        for (let i = 1; i <= 10; i++) {
            sum += parseInt(cleanCpf.substring(i - 1, i)) * (12 - i);
        }

        rest = (sum * 10) % 11;

        if (rest === 10 || rest === 11) {
            rest = 0;
        }

        if (rest !== parseInt(cleanCpf.substring(10, 11))) {
            return false;
        }

        return true;
    };

    const handleBlur = () => {
        if (!validateCpf(value)) {
            FLUIGC.toast({
                title: "CPF inválido!",
                message: "",
                type: "warning"
            });
            onChange("");
        }
    };

    return (
        <div>
            <input type="text" id="cpf" name="cpf" value={value} onChange={handleCpfChange} onBlur={handleBlur} maxLength="14" className="form-control" />
        </div>
    );
}

function AssinaturaEletronica({ NomeArquivo, ChaveArquivo, jsonAssinantes, DataEnvio, HorarioEnvio, Status }) {
    const [Assinatura, setAssinatura] = useState({
        NomeArquivo: "",
        ChaveArquivo: "",
        jsonAssinantes: "",
        DataEnvio: "",
        HorarioEnvio: "",
        Status: ""
    });
    const [UrlDocumento, setUrlDocumento] = useState("");

    const [UrlAnexo, setUrlAnexo] = useState("");
    useEffect(() => {
        BuscaAssinatura($("#numProcess").val()).then((assinatura) => setAssinatura(assinatura));
        BuscaDocumentoFluig().then((url) => setUrlDocumento(url));
        BuscaDocumentoAnexo().then((url) => setUrlAnexo(url));
    }, []);

    function BuscaDocumentoFluig() {
        return new Promise((resolve, reject) => {
            $.ajax({
                url: "http://fluig.castilho.com.br:1010" + "/api/public/2.0/documents/getDownloadURL/" + $("#docId").val(), //Prod
                //url: "http://homologacao.castilho.com.br:2020" + "/api/public/2.0/documents/getDownloadURL/" + id,//Homolog
                contentType: "application/json",
                method: "GET",
                success: function (retorno) {
                    resolve(retorno.content);
                },
                error: function (e, x) {
                    FLUIGC.toast({
                        title: "",
                        message: "Erro ao buscar documento: " + e,
                        type: "warning"
                    });
                    reject();
                }
            });
        });
    }

    function BuscaDocumentoAnexo() {
        return new Promise((resolve, reject) => {
            $.ajax({
                url: "http://fluig.castilho.com.br:1010" + "/api/public/ecm/document/" + $("#docId").val() + "/1000", //Prod
                //url: "http://homologacao.castilho.com.br:2020" + "/api/public/2.0/documents/getDownloadURL/" + id,//Homolog
                contentType: "application/json",
                method: "GET",
                success: function (retorno) {
                    resolve(retorno.content.attachments[0].downloadURL);
                },
                error: function (e, x) {
                    FLUIGC.toast({
                        title: "",
                        message: "Erro ao buscar documento: " + e,
                        type: "warning"
                    });
                    reject();
                }
            });
        });
    }

    function BuscaAssinatura(numSolic) {
        return new Promise((resolve, reject) => {
            DatasetFactory.getDataset("ds_form_aux_wesign", null, [DatasetFactory.createConstraint("numSolic", numSolic, numSolic, ConstraintType.MUST)], null, {
                success: (ds) => {
                    console.log(ds)
                    if (ds.values.length > 0) {
                        var assinatura = {
                            NomeArquivo: ds.values[0].nmArquivo,
                            ChaveArquivo: ds.values[0].chaveArquivo,
                            jsonAssinantes: JSON.parse(ds.values[0].jsonSigners),
                            DataEnvio: ds.values[0].dataEnvio,
                            HorarioEnvio: ds.values[0].horaEnvio,
                            Status: ds.values[0].statusAssinatura
                        };
                        console.log(assinatura);
                        $("#hiddenStatusDocumento").val(ds.values[0].statusAssinatura);
                        resolve(assinatura);
                    } else {
                        FLUGIC.toast({
                            title: "Assinatura não Encontrada!",
                            message: "",
                            type: "warning"
                        });
                        reject();
                    }
                }
            });
        });
    }

    function handleAbreModal() {
        ModalAssinantes = FLUIGC.modal(
            {
                title: NomeArquivo,
                content: '<div id="rootAssinantes"></div>',
                id: "ModalAssinantes",
                size: "full",
                actions: [
                    {
                        label: "Cancelar",
                        autoClose: true
                    }
                ]
            },
            function (err, data) {
                if (err) {
                    // do error handling
                } else {
                    ReactDOM.render(React.createElement(ListaAssinantes, { jsonAssinantes: Assinatura.jsonAssinantes }), document.querySelector("#rootAssinantes"));
                }
            }
        );
    }

    return (
        <div className="panel panel-primary">
            <div className="panel-heading">
                <h3 className="panel-title">Assinatura</h3>
            </div>
            <div className="panel-body">
                <table className="table table-bordered">
                    <thead>
                        <tr>
                            <th>Arquivo</th>
                            <th>Assinantes</th>
                            <th>Data de Envio</th>
                            <th>Horário de Envio</th>
                            <th>Status</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr>
                            <td>
                                <a target="_blank" href={UrlDocumento}>
                                    {Assinatura.NomeArquivo}
                                </a>
                            </td>
                            <td style={{ textAlign: "center" }}>
                                <button type="button" className="btn btn-primary" onClick={() => handleAbreModal()}>
                                    Assinantes {"(" + Assinatura.jsonAssinantes.length + ")"}
                                </button>
                            </td>
                            <td>{Assinatura.DataEnvio}</td>
                            <td>{Assinatura.HorarioEnvio}</td>
                            <td>{Assinatura.Status}</td>
                        </tr>
                    </tbody>
                </table>

                {Assinatura.Status == "Assinado" && (
                    <div style={{ textAlign: "center" }}>
                        <a target="_blank" href={UrlAnexo} className="btn btn-success">
                            Baixar Versão Assinada
                        </a>
                    </div>
                )}
            </div>
        </div>
    );
}

function ListaAssinantes({ jsonAssinantes }) {
    console.log(jsonAssinantes);
    return (
        <table className="table table-bordered">
            <thead>
                <tr>
                    <th>Nome</th>
                    <th>E-mail</th>
                    <th>CPF</th>
                    <th>Status</th>
                    <th>Link para Assinatura</th>
                </tr>
            </thead>
            <tbody>
                {jsonAssinantes.map((Assinante) => {
                    return (
                        <tr>
                            <td>{Assinante.nome}</td>
                            <td>{hex2a(Assinante.email)}</td>
                            <td>{hex2a(Assinante.cpf)}</td>
                            <td>
                                <span className={"btn " + (Assinante.status == "Assinado" ? "btn-success" : "btn-warning")}>{Assinante.status}</span>
                            </td>
                            <td>
                                <a href={Assinante.signUrl} target="_blank">
                                    {Assinante.signUrl}
                                </a>
                            </td>
                        </tr>
                    );
                })}
            </tbody>
        </table>
    );
}
