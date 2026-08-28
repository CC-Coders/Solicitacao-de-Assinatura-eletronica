function displayFields(form, customHTML) {
    var atividade = getValue('WKNumState');
    form.setValue("atividade", atividade);
    form.setValue("formMode", form.getFormMode());
    var usu = getValue("WKUser");
    form.setValue("userCode", usu);

    if (atividade == 0 || atividade == 4) {
        form.setValue("solicitante", usu);
        form.setValue("docId", getValue("docId"));
        form.setValue("docName", getValue("docName"));
    }
}