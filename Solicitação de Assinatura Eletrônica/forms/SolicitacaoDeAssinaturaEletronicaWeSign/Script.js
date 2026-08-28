$(document).ready(function(){
    setTimeout(async () => {
        // Espera o valor do SolicitanteAprovaSolicitação antes de renderizar
        await VerificaSeSolicitanteAprovadorDeAssinatura();

        ReactDOM.render(React.createElement(AppRoot), document.querySelector('#AppRoot'));

    }, 400);
});
