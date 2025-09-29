function displayFields(form, customHTML) {
    var atividade = getValue('WKNumState');
    form.setValue("atividade", atividade);
    form.setValue("formMode", form.getFormMode());
    0
    var usu = getValue("WKUser");
    form.setValue("userCode", usu);

    if (atividade == 0 || atividade == 4) {
        form.setValue("solicitante", usu);
    }
}