sap.ui.define([
	"sap/ui/core/UIComponent",
	"sap/ui/Device",
	"./model/models",
	"./model/formatter"
], function (UIComponent, Device, models, formatter) {
	"use strict";

	return UIComponent.extend("adnoc.vi.vehicleinspection.controller.Component", {

		metadata: {
			manifest: "json"
		},

		/**
		 * The component is initialized by UI5 automatically during the startup of the app and calls the init method once.
		 * @public
		 * @override
		 */
		init: function () {
			// call the base component's init function
			UIComponent.prototype.init.apply(this, arguments);

			// Load from sessionStorage if available
			var sData = sessionStorage.getItem("PlantDetails");
			var oData = sData ? JSON.parse(sData) : { username: "Guest" };

			// Access existing global model (already created via manifest.json)
			var GlobalModel = this.getModel("oGlobalModel");

			// Update property in that model
			GlobalModel.setProperty("/PlantF4Nav", oData);
			GlobalModel.setProperty("/PlantCode", oData.plantCode);
			GlobalModel.setProperty("/PlantName", oData.plantName);
			GlobalModel.setProperty("/MainPlantSiteNo", oData.legacySiteNo);
			GlobalModel.setProperty("/RegionCode", oData.regionCode);
			GlobalModel.setProperty("/Division", oData.division);
			GlobalModel.setProperty("/SalesOrganization", oData.salesOrganization);
			GlobalModel.setProperty("/RegionDesc", oData.regionDesc);
			GlobalModel.setProperty("/City", oData.city);
			GlobalModel.setProperty("/plantItcCode", oData.plantItcCode);
			GlobalModel.setProperty("/MainPlantCustomer", oData.plantCustomer);
			GlobalModel.setProperty("/Street", oData.street);
			GlobalModel.setProperty("/POBox", oData.pobox);
			GlobalModel.setProperty("/TRN",oData.trn);
			
			// set the device model
			this.setModel(models.createDeviceModel(), "device");
			let oPathSaveReq = jQuery.sap.getModulePath(
				'adnoc.vi.vehicleinspection',
				'/model/sysmodel.json'
			);

			let oMenuModel = new sap.ui.model.json.JSONModel(oPathSaveReq);
			this.setModel(oMenuModel, "sysModel");
			this.getRouter().initialize();
			//this.setModel(oModel, "mainService");
			var oRootPath = sap.ui.require.toUrl("adnoc/vi/vehicleinspection"); // your resource root
			var oImageModel = new sap.ui.model.json.JSONModel({
				path: oRootPath
			});
			this.setModel(oImageModel, "imageModel");
			var currdate = new Date();
			var DateFormat = sap.ui.core.format.DateFormat.getDateInstance({
				pattern: "dd/MM/yyyy"
			});
			currdate = DateFormat.format(currdate);

			/*VIRGlobal Model*/
			this.setModel(new sap.ui.model.json.JSONModel({
				"unRegplateno": "",
				"Purpose": "",
				"PlateNo": "",
				"PlateCode": "",
				"MahaFileUpdated": false,
				"MahaFileNotUpdated": true,
				"SecMobileNo": "",
				"Esmatest": "ESMA Test",
				"Traffictest": "Traffic Test",
				"CurrItemNo": "10",
				"MyCartCount": "0",
				"Comprehensivetest": "Comprehensive Test",
				"VisualVisible": true,
				"PendingReq": [{
					"ReqNo": "339532839",
					"ReqDate": currdate,
					"Plateno": "88329",
					"PlateColor": "55",
					"Kind": "Private",
					"Source": "ABU DHABI",
					"Paymenttype": "Success",
					"TotalAmt": "In-Progress",
					"Lane": "1",
					"Amout": "125",
					"Customer": "Mohammed Anzar",
					"MahaVisible": true,
					"Inspvisible": false
				}, {
					"ReqNo": "311900929",
					"ReqDate": currdate,
					"Plateno": "82261",
					"PlateColor": "12",
					"Kind": "Private",
					"Source": "ABU DHABI",
					"Paymenttype": "Fail",
					"TotalAmt": "In-Progress",
					"Lane": "3",
					"Amout": "185",
					"Customer": "Shoail Khan",
					"MahaVisible": true,
					"Inspvisible": false
				}, {
					"ReqNo": "351092849",
					"ReqDate": currdate,
					"Plateno": "42145",
					"PlateColor": "1",
					"Kind": "Private",
					"Source": "ABU DHABI",
					"Paymenttype": "Success",
					"TotalAmt": "In-Progress",
					"Lane": "1",
					"Amout": "169",
					"Customer": "Shoib Akthar",
					"MahaVisible": false,
					"Inspvisible": true
				}, {
					"ReqNo": "323412346",
					"ReqDate": currdate,
					"Plateno": "66542",
					"PlateColor": "7",
					"Kind": "Private",
					"Source": "ABU DHABI",
					"Paymenttype": "Fail",
					"TotalAmt": "In-Progress",
					"Lane": "3",
					"Amout": "87",
					"Customer": "Mohammed Irfan",
					"MahaVisible": true,
					"Inspvisible": false
				}, {
					"ReqNo": "344532460",
					"ReqDate": currdate,
					"Plateno": "44125",
					"PlateColor": "A",
					"Kind": "Private",
					"Source": "DUBAI",
					"Paymenttype": "Fail",
					"TotalAmt": "In-Progress",
					"Lane": "2",
					"Amout": "120",
					"Customer": "Mohammed Hafiz",
					"MahaVisible": false,
					"Inspvisible": true
				}],
				"Platecolor": "",
				"CurrentInspection": "",
				"Bay": "",
				"SR": "",
				"Expanded": true,
				"Retest": [],
				"PrevOrder": "",
				"Authcode": "",
				"Status": "",
				"TransactionMessage": "",
				"BAYF41": [{
					"BAY": "L1 | ANPC7 | M10.20.2"
				}, {
					"BAY": "L2 | ANPC3 | M10.20.2"
				}, {
					"BAY": "L3 | ANPC8 | M10.20.2"
				}, {
					"BAY": "L4 | ANPC9 | M10.20.2"
				}, {
					"BAY": "L5 | ANPC1 | M10.20.2"
				}],
				"BAYF4": [{
					"BAY": "Standard Lane L1"
				}, {
					"BAY": "Standard Lane L2"
				}, {
					"BAY": "Standard Lane L3"
				}, {
					"BAY": "Standard Lane L4"
				}, {
					"BAY": "Premium Lane"
				}],
				"ServiceItems": [],
				"CartItemVisble": false,
				"MainIcontabbarVisible": true,
				"InspItems": [],
				"PurposeF4": [{
					"Purpose": "Re-New"
				}, {
					"Purpose": "Fresh Test"
				}, {
					"Purpose": "ESMA Test"
				}, {
					"Purpose": "Traffic Test"
				}, {
					"Purpose": "Comprehensive Test"
				}, {
					"Purpose": "Re-Test"
				}, {
					"Purpose": "Permit"
				}, {
					"Purpose": "Safety Items"
				}]

			}), "VIRGlobalModel");



			// let oRenderer = sap.ushell.Container.getRenderer("fiori2");
			// oRenderer.setHeaderVisibility(false, false, ["home", "app"]);

			const oPersistentVehicleModel = new sap.ui.model.json.JSONModel({ VehOrdInspDetailsStore: [] });
			this.setModel(oPersistentVehicleModel, "PersistentVehicleDataModel");

		}

	});
});