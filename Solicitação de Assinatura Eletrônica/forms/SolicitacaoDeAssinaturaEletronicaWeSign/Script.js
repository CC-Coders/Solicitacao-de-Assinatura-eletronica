$(document).ready(function(){
    setTimeout(async () => {
        // Espera o valor do SolicitanteAprovaSolicitação antes de renderizar
        await VerificaSeSolicitanteAprovadorDeAssinatura();

        ReactDOM.render(React.createElement(AppRoot), document.querySelector('#AppRoot'));

    }, 400);
    var tentativas = 0;
    var intervalo = setInterval(function () {
        if (OcultarEnviarNativoFluig() || ++tentativas >= 20) clearInterval(intervalo);
    }, 200);
});
