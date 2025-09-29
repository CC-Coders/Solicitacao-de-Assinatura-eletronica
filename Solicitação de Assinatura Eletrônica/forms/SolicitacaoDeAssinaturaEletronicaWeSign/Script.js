$(document).ready(function(){
    setTimeout(() => {
        ReactDOM.render(React.createElement(AppRoot),  document.querySelector('#AppRoot'));

        VerificaSeSolicitanteAprovadorDeAssinatura();

    }, 400);
});
