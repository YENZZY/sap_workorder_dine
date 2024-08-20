sap.ui.define([
    "sap/ui/model/json/JSONModel",
    "sap/ui/Device",
    "sap/ui/model/odata/v2/ODataModel"
], 
function (JSONModel, Device, ODataModel) {
    "use strict";

    return {
        /**
         * Provides runtime info for the device the UI5 app is running on as JSONModel
         */
        createDeviceModel: function () {
            var oModel = new JSONModel(Device);
            oModel.setDefaultBindingMode("OneWay");
            return oModel;
        },
         // api
         createProductionRoutingModel: function () {
            var oModel = new ODataModel('/sap/opu/odata/sap/API_PRODUCTION_ORDER_2_SRV/');
            return oModel;
        }
    };

});