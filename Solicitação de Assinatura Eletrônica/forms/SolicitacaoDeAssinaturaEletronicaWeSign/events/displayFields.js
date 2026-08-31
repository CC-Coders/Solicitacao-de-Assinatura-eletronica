function displayFields(form, customHTML) {
    var atividade = getValue('WKNumState');
    var formMode = form.getFormMode();
    form.setValue("atividade", atividade);
    form.setValue("formMode", formMode);
    var usu = getValue("WKUser");
    form.setValue("userCode", usu);


    if ((atividade == 0 || atividade == 4) && formMode == "ADD") {
        form.setValue("solicitante", usu);
        form.setValue("docId", getValue("docId"));
        form.setValue("docName", getValue("docName"));
    }
}