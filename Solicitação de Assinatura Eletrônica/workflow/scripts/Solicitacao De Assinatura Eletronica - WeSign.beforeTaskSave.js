function beforeTaskSave(colleagueId, nextSequenceId, userList) {
    var atividade = getValue("WKNumState");

    if (atividade == "0" || atividade == "4") {
        hAPI.setCardValue("numProcess", getValue("WKNumProces"));
        AnexarDocumento(hAPI.getCardValue("docId"));
    }

    if ((atividade == 5 && hAPI.getCardValue("hiddenAprovacao") == "Aprovar") || ((atividade == 0 || atividade == 4) && hAPI.getCardValue("SolicitanteAprovaSolicitacao") == "true")) {
        CriaAssinatura();
    }
}
function AnexarDocumento(id) {
    var attachments = hAPI.listAttachments();
    var isAnexado = false;

    for (var i = 0; i < attachments.size(); i++) {
        if (id == attachments.get(i).getDocumentId()) {
            isAnexado = true;
        }
    }

    if (!isAnexado) {
        hAPI.attachDocument(id);
    }
}
function CriaAssinatura() {
    var NomeArquivo = hAPI.getCardValue("docName");
    var IdArquivo = hAPI.getCardValue("docId");
    var CodRemetente = hAPI.getCardValue("solicitante");

    var ds = DatasetFactory.getDataset("ds_auxiliar_wesign", null, [
        DatasetFactory.createConstraint("nmArquivo", NomeArquivo, NomeArquivo, ConstraintType.MUST),
        DatasetFactory.createConstraint("codArquivo", IdArquivo, IdArquivo, ConstraintType.MUST),
        DatasetFactory.createConstraint("vrArquivo", "1000", "1000", ConstraintType.MUST),
        DatasetFactory.createConstraint("codPasta", "655172", "655172", ConstraintType.MUST),
        DatasetFactory.createConstraint("codRemetente", CodRemetente, CodRemetente, ConstraintType.MUST),
        DatasetFactory.createConstraint("nmRemetente", BuscaNomeUsuario(CodRemetente), BuscaNomeUsuario(CodRemetente), ConstraintType.MUST),
        DatasetFactory.createConstraint("status", "Enviando para assinatura", "Enviando para assinatura", ConstraintType.MUST),
        DatasetFactory.createConstraint("metodo", "create", "create", ConstraintType.MUST),
        DatasetFactory.createConstraint("jsonSigners", hAPI.getCardValue("jsonSigner"), hAPI.getCardValue("jsonSigner"), ConstraintType.MUST),
        DatasetFactory.createConstraint("numSolic", getValue("WKNumProces"), getValue("WKNumProces"), ConstraintType.MUST)
    ], null);

    if (ds.getValue(0, "Result") == "OK") {
      return true;
    }
    else{
        log.error(ds.getValue("Erro ao enviar Assinatura Eletronica"));
        log.error(ds.getValue(0, "mensagem"));
        throw "Erro ao Criar a Assinatura Eletrôncia!";
    }
}

function BuscaNomeUsuario(CodUsuario) {
    var ds = DatasetFactory.getDataset("colleague", ["colleagueName"], [
        DatasetFactory.createConstraint("colleagueId", CodUsuario, CodUsuario, ConstraintType.MUST)
    ], null);

    return ds.getValue(0, "colleagueName");
}