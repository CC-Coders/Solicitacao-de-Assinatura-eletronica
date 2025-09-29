function afterTaskSave(colleagueId,nextSequenceId,userList){

    var atividade = getValue("WKNumState");
    if ((atividade == 5 && hAPI.getCardValue("hiddenAprovacao") == "Aprovar") || ((atividade == 0 || atividade == 4) && hAPI.getCardValue("SolicitanteAprovaSolicitacao") == "true")) {
        var ds_upload = DatasetFactory.getDataset("ds_upload_wesign_manual", null, [
            DatasetFactory.createConstraint('codArquivo', hAPI.getCardValue("docId"), hAPI.getCardValue("docId"), ConstraintType.MUST)
        ], null);
        return true;
    
    }
}