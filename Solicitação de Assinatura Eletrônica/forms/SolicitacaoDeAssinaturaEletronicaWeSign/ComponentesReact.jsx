const useEffect = React.useEffect;
const useState = React.useState;
const Select = antd.Select;

function AppRoot() {
    const [Assinantes, setAssinantes] = useState([]);
    const [listAssinantes, setlistAssinantes] = useState([]);
    const [PaginaAtual, setPaginaAtual] = useState("Dados Gerais");

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

    function BuscaListaAssinantes() {
        return new Promise((resolve, reject) => {
            DatasetFactory.getDataset("dsCadastroAssinantesWesign", [], [], null, {
                success: (ds) => {
                    if (ds.values[0].STATUS != "SUCCESS") {
                        console.error(ds);
                    } else {
                        var assinantes = [];
                        var retorno = JSON.parse(ds.values[0].RESULT)
                        for (const assinante of retorno) {
                            assinantes.push({
                                Nome: assinante.NOME,
                                Email: hex2a(assinante.email),
                                Cpf: hex2a(assinante.cpf)
                            });
                        }
                        console.log("Lista de assinantes:", assinantes);
                        resolve(assinantes);
                    }
                },
                error: (err) => {
                    console.error("Erro ao carregar assinantes:", err); // Logar erros, se ocorrerem
                    reject(err);
                }
            });
        });
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

    // Valida e clica no botao nativo do Fluig, que esta escondido
    function Enviar() {
        if (ValidaAntesDeEnviar()) {
            AcionarEnvioFluig();
        }
    }

    // Etapa de Aprovacao: a decisao vai no #hiddenAprovacao antes de enviar
    function Decidir(decisao) {
        $("#hiddenAprovacao").val(decisao);
        Enviar();
    }

    return (
        <>
            <CastilhoWizard etapas={[
                { NOME: "Início", etapas: [0, 4], regra: () => { return true } },
                { NOME: "Aprovação", etapas: [5], regra: () => { return $("#SolicitanteAprovaSolicitacao").val() != "true" } },
                { NOME: "Assinatura", etapas: [23], regra: () => { return true } },
                { NOME: "Fim", etapas: [7, 11], regra: () => { return true } },
            ]} />


                {PaginaAtual == "Dados Gerais" &&
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
                        {$("#atividade").val() == "23" && <AssinaturaEletronica />}
                    </>

                }

                {PaginaAtual == "Historico" &&
                    <>
                        {$("#formMode").val() != "VIEW" && (
                            <>
                                <div id="divDecisaoBotoes">
                                    {$("#atividade").val() == "5" ? (
                                        <>
                                            <button type="button" className="btn btn-success" onClick={() => Decidir("Aprovar")}>Aprovar</button>
                                            <button type="button" className="btn btn-warning" onClick={() => Decidir("Retornar")}>Retornar</button>
                                            <button type="button" className="btn btn-danger" onClick={() => Decidir("Cancelar")}>Cancelar</button>
                                        </>
                                    ) : (
                                        <button type="button" className="btn btn-success" onClick={() => Enviar()}>Enviar Solicitação</button>
                                    )}
                                </div>

                                <div className="historico-obs">
                                    <label htmlFor="textareaMotivo">Demais Informações:</label>
                                    <textarea id="textareaMotivo" rows="4" className="form-control" defaultValue={$("#motivo").val()}
                                        onChange={(e) => $("#motivo").val(e.target.value)}
                                        placeholder="Digite aqui sua observação, justificativa ou orientação para a próxima etapa."></textarea>
                                </div>
                            </>
                        )}

                        <CastilhoHistorico campos={{
                            TITULO: "tableHistoricoUsuario",
                            SUBTITULO: "tableHistoricoAtividade",
                            DATA: "tableHistoricoData",
                            TEXTO: "tableHistoricoObservacao",
                            ACAO: "tableHistoricoAcao",
                        }} />
                    </>
                }


            <CastilhoFooter abas={[
                { NOME: "Dados Gerais", SUBTITULO: "Documento . Assinantes", regra: () => { return true } },
                { NOME: "Historico", SUBTITULO: "Movimentações do processo", regra: () => { return true } },
            ]} paginaAtual={PaginaAtual} mudarPagina={(pagina)=>{setPaginaAtual(pagina)}} />
        </>
    );
}

function CastilhoHistorico({
    campos
}) {
    const [linhas, setLinhas] = useState([]);

    function LeLinhasHistorico() {
        var lidas = [];

        $("#tableHistorico tbody tr:not(:first)").each(function() {
            var linha = {};

            Object.keys(campos).forEach((nome) => {
                linha[nome] = $(this).find("." + campos[nome]).val();
            });

            lidas.push(linha);
        });

        return lidas.reverse();
    }

    function FormataData(data) {
        var convertida = new Date(String(data || "").replace(" ", "T"));
        if (isNaN(convertida.getTime())) return "-";

        return convertida.toLocaleString("pt-BR");
    }

    function CorDaBorda(texto) {
        var acao = String(texto || "").toLowerCase();

        if (acao.indexOf("aprov") !== -1 || acao.indexOf("enviad") !== -1) return {
            border: "solid 1px green"
        };
        if (acao.indexOf("reprov") !== -1 || acao.indexOf("retorn") !== -1 || acao.indexOf("cancel") !== -1) return {
            border: "solid 1px red"
        };

        return {};
    }

    useEffect(() => {
        setLinhas(LeLinhasHistorico());
    }, []);

    return (
        <div className="conteudo-historico">
            <h2 className="historico-titulo">Histórico</h2>



            <div className="panel panel-default" id="historico">
                <div className="panel-heading">
                    <h4 className="panel-title">Histórico</h4>
                </div>
                <div className="panel-body">
                    {linhas.length === 0 && (
                        <div className="historico-vazio">
                            <i className="flaticon flaticon-clock icon-md" aria-hidden="true"></i>
                            Nenhuma movimentação registrada até o momento.
                        </div>
                    )}

                    <div id="divLinhasHistorico">
                        {linhas.map((linha, indice) => (
                            <div className="card" key={indice}>
                                <div className="card-body" style={CorDaBorda(linha.ACAO)}>
                                    <div style={{ display: "flex" }}>
                                        <div className="divImageUser" style={{ marginRight: "20px" }}>
                                            <img className="userImage" src={"/api/public/social/image/" + linha.TITULO}
                                                onError={(e) => e.target.style.display = "none"} />
                                        </div>
                                        <div>
                                            <h3 className="card-title">
                                                {linha.TITULO} <small>{linha.SUBTITULO}</small>
                                            </h3>
                                            <small>{FormataData(linha.DATA)}</small>
                                            <p className="card-text">{linha.TEXTO || linha.ACAO}</p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}

// Define etapas e a etapa ativa
function CastilhoWizard({
    etapas
}) {

    // Mapeia a atividade atual para o indice dentro da lista de estados informada
    function EtapaAtiva() {
        var atividade = Number($("#atividade").val() || 0);

        for (var i = 0; i < etapas.length; i++) {
            if (etapas[i].etapas.indexOf(atividade) !== -1) return i;
        }

        return 0;
    }

    return (
        <div className="castilhoWizard-progress">
            {etapas.map((etapa, indice) => {
                if (etapa.regra()) {
                    var classe = "step";
                    if (indice < EtapaAtiva()) classe += " completed";
                    if (indice === EtapaAtiva()) classe += " active";

                    return (
                        <div key={indice} className={classe}>
                            {etapa.NOME}
                        </div>
                    );
                } else {
                    return null;
                }
            })}
        </div>
    );
}

// Define as abas do formulario e a navegacao entre elas
function CastilhoFooter({
    abas,
    paginaAtual,
    mudarPagina
}) {

    // Indices das abas que a regra deixa aparecer
    function IndicesVisiveis() {
        var visiveis = [];

        abas.forEach((aba, indice) => {
            if (aba.regra()) visiveis.push(indice);
        });

        return visiveis;
    }

    var visiveis = IndicesVisiveis();
    var posicaoAtual = visiveis.findIndex((indice) => abas[indice].NOME === paginaAtual);

    return (
        <>
            <div className="castilho-footer">
                <button type="button" className="stepper-arrow left" title="Anterior"
                    disabled={posicaoAtual <= 0} onClick={() => mudarPagina(abas[visiveis[posicaoAtual - 1]].NOME)}>
                    <i className="fluigicon fluigicon-chevron-left icon-sm" aria-hidden="true"></i>
                </button>

                {abas.map((aba, indice) => {
                    if (aba.regra()) {
                        // Posicao entre as visiveis, para numerar o cartao sem contar as escondidas
                        var posicao = visiveis.indexOf(indice);

                        var classe = "step-item";
                        if (posicao === posicaoAtual) classe += " active";
                        if (posicao < posicaoAtual) classe += " done";

                        return (
                            <React.Fragment key={indice}>
                                {posicao > 0 && <div className="step-connector"><div className="step-connector-line"></div></div>}

                                <div className={classe} onClick={() => mudarPagina(aba.NOME)}>
                                    <div className="step-circle">{posicao + 1}</div>
                                    <div className="step-info">
                                        <span className="step-label">ETAPA {posicao + 1} DE {visiveis.length}</span>
                                        <span className="step-name">{aba.NOME}</span>
                                        <span className="step-sub">{aba.SUBTITULO}</span>
                                    </div>
                                </div>
                            </React.Fragment>
                        );
                    } else {
                        return null;
                    }
                })}

                <button type="button" className="stepper-arrow right" title="Próximo"
                    disabled={posicaoAtual >= visiveis.length - 1} onClick={() => mudarPagina(abas[visiveis[posicaoAtual + 1]].NOME)}>
                    <i className="fluigicon fluigicon-chevron-right icon-sm" aria-hidden="true"></i>
                </button>
            </div>
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

function Assinante({
    nome,
    email,
    cpf,
    onExcluirAssinante
}) {
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

function SelecionadorDeAssinantes({
    Assinantes,
    onAdicionarAssinante,
    onExcluirAssinante,
    onCadastrarAssinante,
    listaAssinantes
}) {
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
        $("[btn-criar-novo-assinante]").on("click", {
            onCriaAssinante: this.handleCriaAssinante
        }, function(e) {
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

function CpfInput({
    onChange,
    value
}) {
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

function SelecionaTokenTAEMaisRecente(dsToken) {
    if (!dsToken || !dsToken.values || dsToken.values.length === 0) {
        return null;
    }

    var melhorToken = null;
    var melhorExpiracao = null;

    dsToken.values.forEach(function(linha) {
        var token = linha && linha.token;
        if (!token || String(token).indexOf("ERRO") === 0) return;

        var expiracao = new Date(FormataExpiracaoTAE(linha.expirationDate));
        if (isNaN(expiracao.getTime())) return;

        if (melhorExpiracao == null || expiracao > melhorExpiracao) {
            melhorExpiracao = expiracao;
            melhorToken = token;
        }
    });

    if (melhorToken == null || melhorExpiracao < new Date()) {
        console.error("Token TAE indisponivel ou expirado em:", melhorExpiracao);
        return null;
    }

    return melhorToken;
}

// O TAE devolve a expiracao em UTC, nem sempre com o sufixo Z.
function FormataExpiracaoTAE(expiracao) {
    var texto = String(expiracao || "");
    if (texto && texto.indexOf("Z") === -1 && texto.indexOf("+") === -1) {
        texto += "Z";
    }
    return texto;
}

// Monta a lista de assinantes a partir do envelope do TAE.
function MontaListaAssinantes(dadosTAE, linksPorEmail) {
    var lista = [];

    (dadosTAE.assinantes || []).forEach(function(a) {
        lista.push({
            nome: a.nome,
            email: a.email,
            cpf: a.cpfCnpj,
            data: a.data,
            status: "Assinado"
        });
    });

    (dadosTAE.pendentes || []).forEach(function(p) {
        // Evita duplicar quem ja esta na lista de assinantes
        if (lista.some(function(a) {
                return a.email == p.email;
            })) return;
        lista.push({
            nome: p.nome || "",
            email: p.email,
            cpf: p.cpfCnpj || "",
            data: "",
            status: "Pendente"
        });
    });

    var doFormulario = LeAssinantesDoFormulario();

    if (lista.length === 0) {
        return doFormulario;
    }

    lista.forEach(function(a) {
        var informado = doFormulario.find(function(s) {
            return s.email == a.email;
        });
        if (!informado) return;

        if (!a.nome) a.nome = informado.nome;
        if (!a.cpf) a.cpf = informado.cpf;
    });

    // Garante nome visivel mesmo quando nao ha correspondencia no formulario
    lista.forEach(function(a) {
        if (!a.nome) a.nome = a.email;
    });

    lista.forEach(function(a) {
        a.link = (linksPorEmail && linksPorEmail[a.email]) || "";
    });

    return lista;
}

function AvisaFalhaDownload() {
    FLUIGC.toast({
        title: "Não foi possível baixar o documento assinado. Tente novamente.",
        message: "",
        type: "warning"
    });
}

// Assinantes preenchidos no formulario, usados para complementar o retorno do TAE.
function LeAssinantesDoFormulario() {
    try {
        return (JSON.parse($("#jsonSigner").val()) || []).map(function(s) {
            return {
                nome: s.nome,
                email: s.email,
                cpf: s.cpf,
                data: "",
                status: "Pendente"
            };
        });
    } catch (e) {
        return [];
    }
}

// O mapeamento numerico de StatusDocumento
function TraduzStatusEnvelope(dadosTAE) {
    if (dadosTAE.motivoRejeicao) return "Rejeitado";

    var lista = MontaListaAssinantes(dadosTAE);
    if (lista.length === 0) return "Pendente";

    var assinados = lista.filter(function(a) {
        return a.status == "Assinado";
    }).length;

    if (assinados === lista.length) return "Assinado";
    if (assinados > 0) return "Assinado parcialmente";
    return "Pendente";
}

// O TAE devolve as datas em UTC, mas nem sempre com o sufixo Z.
function FormataDataTAE(data) {
    if (!data) return "-";

    var texto = String(data);
    if (texto.indexOf("Z") === -1 && texto.indexOf("+") === -1) {
        texto += "Z";
    }

    var convertida = new Date(texto);
    if (isNaN(convertida.getTime())) return "-";

    return convertida.toLocaleString("pt-BR");
}

function FormataCpfCnpj(valor) {
    var numeros = String(valor || "").replace(/\D/g, "");

    if (numeros.length === 11) {
        return numeros.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, "$1.$2.$3-$4");
    }
    if (numeros.length === 14) {
        return numeros.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, "$1.$2.$3/$4-$5");
    }

    return valor || "";
}

function AssinaturaEletronica() {
    const [Assinatura, setAssinatura] = useState(null);
    const [UrlDocumento, setUrlDocumento] = useState("");
    const [carregando, setCarregando] = useState(true);
    const [baixando, setBaixando] = useState(false);

    useEffect(() => {
        BuscaAssinaturaTAE()
            .then((assinatura) => {
                setAssinatura(assinatura);
                $("#hiddenStatusDocumento").val(assinatura.Status);
            })
            .catch(() => {})
            .finally(() => setCarregando(false));

        BuscaUrlDocumentoFluig().then((url) => setUrlDocumento(url));
    }, []);

    function BuscaUrlDocumentoFluig() {
        return new Promise((resolve) => {
            $.ajax({
                url: "/api/public/2.0/documents/getDownloadURL/" + $("#docId").val(),
                contentType: "application/json",
                method: "GET",
                success: (retorno) => resolve(retorno.content),
                error: () => resolve("")
            });
        });
    }

    function BuscaAssinaturaTAE() {
        return new Promise((resolve, reject) => {
            var envelopeId = $("#taeEnvelopeId").val();
            if (!envelopeId) {
                reject("taeEnvelopeId nao encontrado");
                return;
            }

            // Busca token para consultar o envelope
            DatasetFactory.getDataset("dsLoginTokenTAE", null, null, null, {
                success: (dsToken) => {
                    var token = SelecionaTokenTAEMaisRecente(dsToken);
                    if (!token) {
                        reject("Token TAE invalido");
                        return;
                    }

                    BuscaLinksAssinantesTAE(envelopeId, token).then((links) => {
                        DatasetFactory.getDataset("dsTAEEnvelopeInfo", null, [
                            DatasetFactory.createConstraint("envelopeId", envelopeId, envelopeId, ConstraintType.MUST),
                            DatasetFactory.createConstraint("token", token, token, ConstraintType.MUST)
                        ], null, {
                            success: (ds) => {
                                var dadosRaw = ds && ds.values && ds.values[0] && ds.values[0].data;
                                var dadosTAE = {};
                                try {
                                    dadosTAE = JSON.parse(dadosRaw) || {};
                                } catch (e) {}

                                resolve({
                                    NomeArquivo: dadosTAE.nomeArquivo || $("#docName").val(),
                                    jsonAssinantes: MontaListaAssinantes(dadosTAE, links),
                                    DataEnvio: $("#taeDataEnvio").val(),
                                    HorarioEnvio: $("#taeHoraEnvio").val(),
                                    Status: TraduzStatusEnvelope(dadosTAE)
                                });
                            },
                            error: (err) => {
                                console.error("Erro ao consultar dsTAEEnvelopeInfo:", err);
                                // Fallback: mostra dados locais mesmo sem status do TAE
                                resolve({
                                    NomeArquivo: $("#docName").val(),
                                    jsonAssinantes: MontaListaAssinantes({}, links),
                                    DataEnvio: $("#taeDataEnvio").val(),
                                    HorarioEnvio: $("#taeHoraEnvio").val(),
                                    Status: "Pendente"
                                });
                            }
                        });
                    });
                },
                error: (err) => reject("Erro ao buscar token TAE: " + err)
            });
        });
    }

    // O link de acesso de cada assinante nao vem na consulta do envelope;
    function BuscaLinksAssinantesTAE(envelopeId, token) {
        return new Promise((resolve) => {
            DatasetFactory.getDataset("dsTAELinksAssinantes", null, [
                DatasetFactory.createConstraint("envelopeId", envelopeId, envelopeId, ConstraintType.MUST),
                DatasetFactory.createConstraint("token", token, token, ConstraintType.MUST)
            ], null, {
                success: (ds) => {
                    var porEmail = {};
                    ((ds && ds.values) || []).forEach(function(linha) {
                        if (linha.email) porEmail[linha.email] = linha.link;
                    });
                    resolve(porEmail);
                },
                // Sem os links a tabela continua util, so fica sem essa coluna.
                error: (err) => {
                    console.error("Erro ao consultar dsTAELinksAssinantes:", err);
                    resolve({});
                }
            });
        });
    }

    function handleBaixarAssinado() {
        var envelopeId = $("#taeEnvelopeId").val();
        if (!envelopeId || baixando) return;

        setBaixando(true);

        DatasetFactory.getDataset("dsLoginTokenTAE", null, null, null, {
            success: (dsToken) => {
                var token = SelecionaTokenTAEMaisRecente(dsToken);
                if (!token) {
                    setBaixando(false);
                    AvisaFalhaDownload();
                    return;
                }

                DatasetFactory.getDataset("dsTAEDownloadAssinado", null, [
                    DatasetFactory.createConstraint("envelopeId", envelopeId, envelopeId, ConstraintType.MUST),
                    DatasetFactory.createConstraint("token", token, token, ConstraintType.MUST)
                ], null, {
                    // Dataset inexistente cai aqui, e nao no error, com values undefined.
                    success: (ds) => {
                        setBaixando(false);
                        var url = (ds && ds.values && ds.values[0] && ds.values[0].url) || "";
                        if (!url) {
                            console.error("dsTAEDownloadAssinado nao retornou URL:", ds);
                            AvisaFalhaDownload();
                            return;
                        }
                        // A URL vem com content-disposition attachment, entao o
                        // navegador baixa o arquivo sem sair da pagina.
                        window.location.href = url;
                    },
                    error: (err) => {
                        setBaixando(false);
                        console.error("Erro ao consultar dsTAEDownloadAssinado:", err);
                        AvisaFalhaDownload();
                    }
                });
            },
            error: (err) => {
                setBaixando(false);
                console.error("Erro ao buscar token TAE:", err);
                AvisaFalhaDownload();
            }
        });
    }

    function handleAbreModal() {
        if (!Assinatura) return;
        ModalAssinantes = FLUIGC.modal({
                title: Assinatura.NomeArquivo,
                content: '<div id="rootAssinantes"></div>',
                id: "ModalAssinantes",
                size: "full",
                actions: [{
                    label: "Cancelar",
                    autoClose: true
                }]
            },
            function(err) {
                if (!err) {
                    ReactDOM.render(
                        React.createElement(ListaAssinantes, {
                            jsonAssinantes: Assinatura.jsonAssinantes
                        }),
                        document.querySelector("#rootAssinantes")
                    );
                }
            }
        );
    }

    if (carregando) {
        return (
            <div className="panel panel-primary">
                <div className="panel-heading"><h3 className="panel-title">Assinatura</h3></div>
                <div className="panel-body" style={{ textAlign: "center" }}>Carregando...</div>
            </div>
        );
    }

    if (!Assinatura) {
        return (
            <div className="panel panel-primary">
                <div className="panel-heading"><h3 className="panel-title">Assinatura</h3></div>
                <div className="panel-body">Não foi possível carregar os dados da assinatura.</div>
            </div>
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
                                    Assinantes ({Assinatura.jsonAssinantes.length})
                                </button>
                            </td>
                            <td>{Assinatura.DataEnvio}</td>
                            <td>{Assinatura.HorarioEnvio}</td>
                            <td>
                                <span className={"btn " + (Assinatura.Status == "Assinado" ? "btn-success" : "btn-warning")}>
                                    {Assinatura.Status}
                                </span>
                            </td>
                        </tr>
                    </tbody>
                </table>

                {Assinatura.Status == "Assinado" && (
                    <div style={{ textAlign: "center" }}>
                        <button type="button" className="btn btn-success" disabled={baixando} onClick={() => handleBaixarAssinado()}>
                            {baixando ? "Preparando download..." : "Baixar documento assinado"}
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}

function ListaAssinantes({
    jsonAssinantes
}) {
    return (
        <div style={{ overflowX: "auto" }}>
            <table className="table table-bordered">
                <thead>
                    <tr>
                        <th>Nome</th>
                        <th>E-mail</th>
                        <th>CPF</th>
                        <th>Data da Assinatura</th>
                        <th>Status</th>
                        <th>Link para Assinatura</th>
                    </tr>
                </thead>
                <tbody>
                    {jsonAssinantes.map((Assinante) => {
                        return (
                            <tr key={Assinante.email}>
                                <td>{Assinante.nome}</td>
                                <td>{Assinante.email}</td>
                                <td>{FormataCpfCnpj(Assinante.cpf)}</td>
                                <td>{FormataDataTAE(Assinante.data)}</td>
                                <td>
                                    <span className={"btn " + (Assinante.status == "Assinado" ? "btn-success" : "btn-warning")}>
                                        {Assinante.status || "Pendente"}
                                    </span>
                                </td>
                                <td>
                                    {Assinante.link
                                        ? <a href={Assinante.link} target="_blank">{Assinante.link}</a>
                                        : "-"}
                                </td>
                            </tr>
                        );
                    })}
                </tbody>
            </table>
        </div>
    );
}