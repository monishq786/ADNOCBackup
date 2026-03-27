/**
* Search Vehicle Controller (V1.0).
* This Controller used to display vehicle Data and Customer data nav to Create Customer
* @author M.Afshan
* @date 10.08.2025
*/
sap.ui.define([
	'adnoc/vi/vehicleinspection/core/generic/genericentryform',
	"sap/ui/core/UIComponent",
	"sap/m/MessageBox",
	'sap/ui/model/json/JSONModel',
	'sap/m/MessageToast',
	'adnoc/vi/vehicleinspection/modone/formatter/Formatter',
	"adnoc/vi/vehicleinspection/modone/utils/FieldWhiteList",
	'adnoc/vi/vehicleinspection/modone/constants/Constant',
	'adnoc/vi/vehicleinspection/modone/constants/ControlIds',
	'sap/m/PDFViewer',
	'sap/m/Dialog',
	'sap/m/Image',
	'sap/m/Button',
],
	function (genericentryform, UIComponent, MessageBox, JSONModel, MessageToast, Formatter, FieldWhiteList, Constant, ControlIds, PDFViewer,Dialog,Image) {
		"use strict";
		let _selectedReprintRow = null;
		return genericentryform.extend("adnoc.vi.vehicleinspection.modone.controller.SearchVehicle", {

			/**
			* onInit Default Function
			* @memberof adnoc.vi.vehicleinspection.modone.controller.AccessoriesOrderProccessing
			* @version 1.0.0
			* @since 15.12.2025
			* @fires 
			* @author M.Afshan
			*/
			onInit: async function () {
				genericentryform.prototype.onInit.apply(this, arguments);
				var oRouter = this.getOwnerComponent().getRouter();
				oRouter.getRoute(Constant.SearchVehicle).attachMatched(this.onloadeFetchSideCenter, this);
				await this.SuggestioncflModel();

			},

			/**function to intialize and call function in this .
			* @memberof adnoc.vi.vehicleinspection.modone.controller.ServiceTest
			* @version 1.0.0
			* @since 01.01.2025
			* @author Afshan
			* @fires 
			*/
			onBeforeShow: async function () {
				this.initialize();
				let bBackToVehicle = this.getView().getModel('BackToSearchVehicleModel').getProperty("/isBackToVehicle");
				if (bBackToVehicle) {
					this.onLoadSetVehcilePrevisousData();
				}
			},

			/**Function for Initilization for Generic Required Function
			* @memberof adnoc.vi.vehicleinspection.modone.controller.ServiceTest
			* @version 1.0.0
			* @since 01.01.2025
			* @author MA
			* @fires 
			*/
			initialize: async function () {
				this.oi18nModel = this.getView().getModel("i18n");
				this.byId(ControlIds.SearchVehicle.CustomerTypeId).setEditable(false);
				this.byId(ControlIds.SearchVehicle.PhoneNoId).setEditable(false);
				this.byId(ControlIds.SearchVehicle.CustomerId).setEditable(false);
				this.byId(ControlIds.SearchVehicle.EmailId).setEditable(false);
				this.byId(ControlIds.SearchVehicle.SaveId).setVisible(false);
				this.byId(ControlIds.SearchVehicle.EditId).setVisible(false);
				this.byId(ControlIds.SearchVehicle.EditMoreDetailId).setVisible(false);
				this.onLoadClearData();
				this.setPageId(ControlIds.SearchVehicle.PageId);
				this.sBtnRecapture = this.byId(ControlIds.SearchVehicle.RecaptureBtn);
				this.byId(ControlIds.SearchVehicle.CustomerSearchId).setEnabled(false);
				this.sCountRecapture = 0;

				let oLandingStatus = {
					formTag: false,
					LableTag: true,
					DropDownCusomerType: false,
					InputCusomerType: true,
					section: true
				}

				let oModelLanding = new JSONModel(oLandingStatus);
				this.getView().setModel(oModelLanding, 'oModelLanding');

				// this.getEmployeMasterData();
				this.oBusinessData = Formatter.onLoadGetDataInSessionStorage('BusinessData');
				this.oBusinessData.BusinessDate = Formatter.getDateFromatIn_ddMMyyyy_HHmm(this.oBusinessData.BusinessDate);
				let oModelBusiness = new JSONModel(this.oBusinessData);
				// getDateFromatIn_ddMMyyyy_HHmm
				this.getView().setModel(oModelBusiness, "oModelbusiness");

				let bIsAddMoreClick = this.getView().getModel("oGlobalModel").getProperty("/isAddMoreClicked");
				let bIsBackToVehicleClick = this.getView().getModel("BackToSearchVehicleModel").getProperty("/isBackToVehicle");
				if (bIsAddMoreClick || bIsBackToVehicleClick) {
					this.getView().getModel("oGlobalModel").setProperty("/isAddMoreVehicle", true);
				} else {
					this.getView().getModel("oGlobalModel").setProperty("/isAddMoreVehicle", false);
				}
				this.getView().getModel('oGlobalModel').setProperty("/BackToSearchVehicle", false);
				this.onLoadDisableControlInRecapture();
			},

			/**function to After Rendering UI
			* @memberof adnoc.vi.vehicleinspection.modone.controller.ServiceTest
			* @version 1.0.0
			* @since 01.01.2025
			* @author MA
			* @fires 
			*/
			onAfterRendering: function () {
				// Reset scroll position on page load
				setTimeout(() => {
					let oPage = this.byId(ControlIds.SearchVehicle.searchVehicleid);
					if (oPage && oPage.scrollTo) {
						oPage.scrollTo(0); // Scroll to top
					}
				}, 100);
			},

			/**Function for Initilization for Generic Required Function
			* @memberof adnoc.vi.vehicleinspection.modone.controller.ServiceTest
			* @version 1.0.0
			* @since 01.01.2025
			* @author MA
			* @fires _getPlateDetailForFreshTest,
			*/
			onBtnPressInspectionType: async function (oEvent) {
				let oGlobalModel = this.getView().getModel("oGlobalModel");
				let oCard = oEvent.getSource();

				// Step 2: Find the Text control inside the Card
				let oText = oCard.findAggregatedObjects(true, function (oControl) {
					return oControl.isA("sap.m.Text");
				})[0]; // take the first Text found

				// Step 3: Get the text value
				let sInspectionType = oText.getText().replace(/\s+/g, '');
				let sValidfreshTest = this.oi18nModel.getProperty('ValidFreshTest');
				let sPlateNumber = this.getView().byId(ControlIds.SearchVehicle.PlateNoIdInput).getValue();
				let sChassisNo = this.getView().byId(ControlIds.SearchVehicle.ChassIdInputId).getValue();

				if (!sChassisNo) {
					MessageBox.warning(sValidfreshTest);
					return;
				}

				// Store in Global JSON Model
				let oModel = this.getOwnerComponent().getModel("plateModel");
				if (!oModel) {
					oModel = new JSONModel();
					this.getOwnerComponent().setModel(oModel, "plateModel");
				}

				let aPlates = oModel.getProperty("/plates") || [];
				// Prevent duplicate tabs

				aPlates.push(sPlateNumber);

				await this._getPlateDetailForFreshTest();
				// Mapping of keywords to Constant.TESTMODE values
				const oTestModeMap = {
					"FreshTest": Constant.TESTMODE.FRESHTEST,
					"Permit": Constant.TESTMODE.PERMIT,
					"Transfers": Constant.TESTMODE.TRANSFER,
					"Accessories": Constant.TESTMODE.ACCESSORIES,
					"ChangeInfo": Constant.TESTMODE.CHANGEINFO,
					"AllServices": Constant.TESTMODE.ALLSERVICES
				};

				// Find matching key in sInspectionType and set sInspectionType accordingly
				for (const key in oTestModeMap) {
					if (sInspectionType.includes(key)) {
						sInspectionType = oTestModeMap[key];
						break; // Stop after first match
					}
				}
				if (sInspectionType === Constant.TESTMODE.TRANSFER) {
					MessageBox.warning(this.oi18nModel.getProperty('searchVehicleMsg_Tranfer'));
					return
				}
				oModel.setProperty("/plates", aPlates);
				oGlobalModel.setProperty("/DynamicInspectionType", sInspectionType);
				Formatter.onLoadSetDataInSessionStorage('PlateInfo', aPlates);
				Formatter.onLoadSetDataInSessionStorage('InspType', sInspectionType);
				oGlobalModel.setProperty("/isBackToOrder", true);
				let oRouter = this.getOwnerComponent().getRouter();
				oRouter.navTo(Constant.Services, { from: sInspectionType });
				this.getView().getModel('BackToSearchVehicleModel').setProperty("/isBackToVehicle", false);
			},

			/**Function for Back to Order Screen
			* @memberof adnoc.vi.vehicleinspection.modone.controller.ServiceTest
			* @version 1.0.0
			* @since 01.01.2025
			* @author MM
			* @fires onBtnPressBackToOrder,
			*/
			onBtnPressBackToOrder: function () {
				let oModel = this.getOwnerComponent().getModel("plateModel");
				let oGlobalModel = this.getOwnerComponent().getModel("oGlobalModel");
				let oInspType = Formatter.onLoadGetDataInSessionStorage('InspType');
				let oPlate = Formatter.onLoadGetDataInSessionStorage('PlateInfo');
				oModel.setProperty("/plates", oPlate);
				oGlobalModel.setProperty("/isBackToOrder", false);
				let oRouter = this.getOwnerComponent().getRouter();
				oRouter.navTo(Constant.Services, { from: oInspType });
			},

			/**Function use for make an object for get plate with customer info
			* @memberof adnoc.vi.vehicleinspection.modone.controller.ServiceTest
			* @version 1.0.0
			* @since 01.01.2025
			* @author MA
			* @fires _getPlateDetailForFreshTest
			*/
			_getPlateDetailForFreshTest: async function () {
				let oReTestCompleteModel = this.getView().getModel("FreshTestForOrderModel");
				let oGlobalModel = this.getView().getModel("oGlobalModel");
				let aMainResults = oReTestCompleteModel.getData().results;
				let oAllPlateFrestTest = {};
				const aFields = FieldWhiteList.VEHICLE_FIELDS;
				let plateNumber;
				aMainResults.forEach((oDetail) => {
					plateNumber = oDetail.plateNumber;
					const oPlateData = {};

					aFields.forEach((sField) => {
						oPlateData[sField] = oDetail[sField];
					});

					// Finally store in structure
					oAllPlateFrestTest[plateNumber] = oPlateData;
				});

				// Set entire model to store data per plateNumber
				let oVehicleData = oAllPlateFrestTest[plateNumber]; // like oData["90588"]

				const oModel = new JSONModel(oAllPlateFrestTest);
				this.getOwnerComponent().setModel(oModel, "GetPlateDataModel");
				oGlobalModel.setProperty("/PlateNo", oVehicleData.plateNumber);
				oGlobalModel.setProperty("/PlateColor", oVehicleData.plateColorCode);
				oGlobalModel.setProperty("/PlateKind", oVehicleData.plateKindCode);
				oGlobalModel.setProperty("/PlateSource", oVehicleData.plateSourceEnglish);
				oGlobalModel.setProperty("/PlateSourceCode", oVehicleData.plateSourceCode);
				oGlobalModel.setProperty("/VehicleType", oVehicleData.typeCode);
				oGlobalModel.setProperty("/VehicleYear", oVehicleData.registrationYear);
			},

			/**Function for Reset all fields
			* @memberof adnoc.vi.vehicleinspection.modone.controller.ServiceTest
			* @version 1.0.0
			* @since 01.01.2025
			* @author MA
			* @fires onBtnPressCountDownTimeCallApi,onloadAllInputVisible
			*/
			onBtnPressReset: function () {
				MessageBox.confirm(
					this.oi18nModel.getProperty('validReset'), {
					icon: MessageBox.Icon.CONFIRM,
					title: this.oi18nModel.getProperty('home_ResetTitle'),
					class: "sapUiSizeCompact",
					actions: [MessageBox.Action.YES, MessageBox.Action.NO],
					onClose: function (oAction) {
						if (oAction === Constant.YESANDNO.YES) {
							this.onLoadClearData();
							this.byId(ControlIds.SearchVehicle.CustomerTypeId).setVisible(false);
							this.byId(ControlIds.SearchVehicle.CustomerId).setEditable(false);
							this.byId(ControlIds.SearchVehicle.EmailId).setEditable(false);
							this.byId(ControlIds.SearchVehicle.PhoneNoId).setEditable(false);
							this.byId(ControlIds.SearchVehicle.CustomerTypeInputId).setEditable(false);
							this.byId(ControlIds.SearchVehicle.EditMoreDetailId).setVisible(false);
							let oTagData = this.getView().getModel('oModelLanding');
							oTagData.setProperty('/formTag', false);
							oTagData.setProperty('/LableTag', true);
							this.byId(ControlIds.SearchVehicle.SaveId).setVisible(false);
							this.byId(ControlIds.SearchVehicle.EditId).setVisible(false);
						}
					}.bind(this)
				});

			},

			/**Function for Clear Data from generic model
			* @memberof adnoc.vi.vehicleinspection.modone.controller.ServiceTest
			* @version 1.0.0
			* @since 01.01.2025
			* @author MA
			* @fires _getPlateDetailForFreshTest,
			*/
			clearGenericEntryForm: function () {
				this.clearGenericListViewForm();
				this.createNewModel(this.getEntryFormDataSourceModelName());
			},

			/**Function use for Customer fields editable   
			* @memberof adnoc.vi.vehicleinspection.modone.controller.ServiceTest
			* @version 1.0.0
			* @since 01.01.2025
			* @author MA
			* @fires 
			*/
			onPressBtpEditCustomer: function () {
				let oCustomomerId = this.byId(ControlIds.SearchVehicle.CustomerId);
				let oEmailId = this.byId(ControlIds.SearchVehicle.EmailId);
				let oPhoneNoId = this.byId(ControlIds.SearchVehicle.PhoneNoId);
				let oSaveId = this.byId(ControlIds.SearchVehicle.SaveId);
				let oEditId = this.byId(ControlIds.SearchVehicle.EditId);
				let oCustomerTypeId = this.byId(ControlIds.SearchVehicle.CustomerTypeId);


				this.getView().getModel('oModelLanding').setProperty('/DropDownCusomerType', true);
				this.getView().getModel('oModelLanding').setProperty('/InputCusomerType', false);
				let oCustomerData = this.getView().getModel('VehicleDataGetModel').getData();

				oCustomomerId.setEditable(true);
				oEmailId.setEditable(true);
				oPhoneNoId.setEditable(true);
				oSaveId.setVisible(true);
				oEditId.setVisible(false);
				this.byId(ControlIds.SearchVehicle.EditMoreDetailId).setVisible(true);
				oCustomerTypeId.setEditable(true);
				if (oCustomerData.lastName == null) { oCustomerData.lastName = ''; }
				oCustomomerId.setValue(oCustomerData.firstName + ' ' + oCustomerData.lastName);
				oEmailId.setValue(oCustomerData.emailAddress);
				oPhoneNoId.setValue(oCustomerData.mobileNo);

			},

			/**Function use for Edit Customer With Routing 
			* @memberof adnoc.vi.vehicleinspection.modone.controller.ServiceTest
			* @version 1.0.0
			* @since 01.01.2025
			* @author MA
			* @fires 
			*/
			onPressBtpEditCustomerWithRoute: function () {
				this.getView().getModel('oModelLanding').setProperty('/DropDownCusomerType', true);
				this.getView().getModel('oModelLanding').setProperty('/InputCusomerType', false);
				let oDataVehicleModel = this.getView().getModel('DetailVehicleModel')
				let customer = this.getView().getModel('CustomerTypeModel');
				let oCustomerdata = oDataVehicleModel.getData()
				const oViewModel = this.getView().getModel("DetailVehicleModel");
				oViewModel.setProperty("/isVehicleEditable", false);
				this.getOwnerComponent().setModel(oDataVehicleModel, "VehicleData");
				const oRouter = this.getOwnerComponent().getRouter();
				oRouter.navTo(Constant.CustomerCreate, {
					query: {
						customerUUID: oCustomerdata.customerInfo.customerUUID
					}
				}, true);
			},

			/**Function use for update Customer Data 
			 * @memberof adnoc.vi.vehicleinspection.modone.controller.ServiceTest
			 * @version 1.0.0
			 * @since 01.01.2025
			 * @author MA
			 * @fires 
			 */
			onPressBtnSaveCustomer: async function () {
				try {
					let bValidateCusField = false;
					this.byId(ControlIds.SearchVehicle.SaveId).setVisible(false);
					this.byId(ControlIds.SearchVehicle.EditId).setVisible(true);
					this.byId(ControlIds.SearchVehicle.CustomerId).setEditable(false);
					this.byId(ControlIds.SearchVehicle.EmailId).setEditable(false);
					this.byId(ControlIds.SearchVehicle.PhoneNoId).setEditable(false);
					let sCustomerType = this.byId(ControlIds.SearchVehicle.CustomerTypeId).getSelectedKey();
					let sCustomerName = this.byId(ControlIds.SearchVehicle.CustomerId).getValue();
					let sCustomerNo = this.byId(ControlIds.SearchVehicle.PhoneNoId).getValue();
					let sCustomerEmail = this.byId(ControlIds.SearchVehicle.EmailId).getValue();
					let oDataDetailVehicleModel = this.getView().getModel('DetailVehicleModel')
					oDataDetailVehicleModel.setProperty("/customertype", sCustomerType);
					this.byId(ControlIds.SearchVehicle.CustomerTypeId).setEditable(false)
					if (sCustomerName) {
						bValidateCusField = true
					} else if (this.byId(ControlIds.SearchVehicle.PhoneNoId).getValue()) {
						bValidateCusField = true
					} else if (this.byId(ControlIds.SearchVehicle.PhoneNoId).getValue()) {
						bValidateCusField = true
					}
					let oCustomerData = this.getView().getModel('CustomerInfoModel').getData();
					let parts = sCustomerName.split(" ");
					let sFirstName = parts[0];
					let sLastName = parts.slice(1).join(" ");
					let oPaylod = {
						firstName: sFirstName,
						lastName: sLastName,
						customerType: sCustomerType,
						mobileNo: sCustomerNo,
						emailAddress: sCustomerEmail
					}

					let oCustomerInfoModel = this.getView().getModel("SalesOrderCardDataModel");
					oCustomerInfoModel.setProperty("/CustomerInfo/firstName", oPaylod.firstName || null);
					oCustomerInfoModel.setProperty("/CustomerInfo/lastName", oPaylod.lastName || null);
					oCustomerInfoModel.setProperty("/CustomerInfo/mobileNo", oPaylod.mobileNo || null);
					oCustomerInfoModel.setProperty("/CustomerInfo/emailAddress", oPaylod.emailAddress || null);
					oCustomerInfoModel.setProperty("/CustomerInfo/customerType", oPaylod.sCustomerType || null);
					let oCustInfoDetail = oCustomerInfoModel.getProperty("/CustomerInfo");
					let oCustInfoCopy = JSON.parse(JSON.stringify(oCustInfoDetail));
					oCustomerInfoModel.setProperty("/CustomerInfoPrev", oCustInfoCopy);
					await this.createNewModelUsingAPI(Constant.PATCH, `/CustomerMasters('${oCustomerData.customerUUID}')`, oPaylod, 'CustomerUpdateModel');
				} catch (error) {
					MessageBox.error(this.oi18nModel.getProperty('searchVehicleMsg_Somethngwrong'));
				}
			},

			//#region Filter Logic for CFLs by Plate color , Plate Source, Plate kind (batch calling)
			/**Function use for auto search in the Lookup plate color
			* @memberof adnoc.vi.vehicleinspection.modone.controller.ServiceTest
			* @version 1.0.0
			* @since 01.01.2025
			* @author MA
			* @fires SuggestioncflModel
			*/
			SuggestioncflModel: async function () {
				const oModel = this.getOwnerComponent().getModel("VehicleinspectionService");
				oModel.setUseBatch(true);
				const sGroupId = "myBatchGroup";
				oModel.setDeferredGroups([sGroupId]);
				const aRequests = [
					{ path: "/VehPlateColorMasters", modelName: "BodyColorMastersModel" },
					{ path: "/VehPlateKindMasters", modelName: "PlateKindMastersModel" },
					{ path: "/VehPlateSourceMasters", modelName: "PlateSourecMastersModel" },
				];
				function readEntity(oModel, path, expand, groupId) {
					return new Promise((resolve, reject) => {
						oModel.read(path, {
							groupId: groupId,
							urlParameters: expand ? { $expand: expand } : {},
							success: (oData) => resolve(oData),
							error: (oError) => reject(oError)
						});
					});
				}
				try {
					const readPromises = aRequests.map(req =>
						readEntity(oModel, req.path, req.expand, sGroupId)
					);
					oModel.submitChanges({ groupId: sGroupId });
					const results = await Promise.all(readPromises);
					results.forEach((oData, i) => {
						const jsonModel = new JSONModel(oData);
						this.getView().setModel(jsonModel, aRequests[i].modelName);
					});

				} catch (err) {
					MessageBox.error(this.oi18nModel.getProperty('searchVehicle_Batchrequestfailed'));
				}
			},

			/**Function use for auto search set data in the model
		   * @memberof adnoc.vi.vehicleinspection.modone.controller.ServiceTest
		   * @version 1.0.0
		   * @since 01.01.2025
		   * @author MA
		   * @fires onSelectedcfl
		   */
			onSelectedcfl: function (type) {
				let oBodyColorMastersModel = this.getView().getModel('BodyColorMastersModel');
				let oPlateKindMastersModel = this.getView().getModel('PlateKindMastersModel');
				let oPlateSourecMastersModel = this.getView().getModel('PlateSourecMastersModel');

				let oBodyColorMastersResponse = oBodyColorMastersModel.oData.results;
				let oPlateColor = this.getView().byId(ControlIds.SearchVehicle.PlateColorid);
				let oBodyColorFilterResponse = oBodyColorMastersResponse.filter(E => E.codeDescEnglish === oPlateColor.getValue())[0];

				if (oBodyColorFilterResponse) {
					oBodyColorMastersModel.setProperty("/colorCode", oBodyColorFilterResponse.codeId);
					oBodyColorMastersModel.setProperty("/codeDescEnglish", oBodyColorFilterResponse.codeDescEnglish);
					oBodyColorMastersModel.setProperty("/codeDescArabic", oBodyColorFilterResponse.codeDescArabic);
				}

				let oPlateKindMastersResponse = oPlateKindMastersModel.oData.results;
				let oPlateKind = this.getView().byId(ControlIds.SearchVehicle.PlateKindId);
				let oPlateKindFilterResponse = oPlateKindMastersResponse.filter(E => E.codeDescEnglish === oPlateKind.getValue())[0];

				if (oPlateKindFilterResponse) {

					oPlateKindMastersModel.setProperty("/codeId", oPlateKindFilterResponse.codeId);
					oPlateKindMastersModel.setProperty("/codeDescArabic", oPlateKindFilterResponse.codeDescArabic);
					oPlateKindMastersModel.setProperty("/codeDescEnglish", oPlateKindFilterResponse.codeDescEnglish);
				}

				let oPlateSourecMastersResponse = oPlateSourecMastersModel.oData.results;
				let oPlateSource = this.getView().byId(ControlIds.SearchVehicle.PlateSourceId);
				let oPlateSoureilterResponse = oPlateSourecMastersResponse.filter(E => E.codeDescEnglish === oPlateSource.getValue())[0];

				if (oPlateSoureilterResponse) {

					oPlateSourecMastersModel.setProperty("/PlateSourceCode", oPlateSoureilterResponse.codeId);
					oPlateSourecMastersModel.setProperty("/codeDescEnglish", oPlateSoureilterResponse.codeDescEnglish);
					oPlateSourecMastersModel.setProperty("/codeDescArabic", oPlateSoureilterResponse.codeDescArabic);

				}

				if (oBodyColorMastersResponse.filter(E => E.codeDescEnglish === oPlateColor.getValue().toUpperCase()).length > 0)
					oBodyColorMastersModel.setProperty("/colorCode", oBodyColorMastersResponse.filter(E => E.codeDescEnglish === oPlateColor.getValue().toUpperCase())[0].codeId);

				if (oPlateKindMastersResponse.filter(E => E.codeDescEnglish === oPlateKind.getValue().toUpperCase()).length > 0)
					oPlateKindMastersModel.setProperty("/codeId", oPlateKindMastersResponse.filter(E => E.codeDescEnglish === oPlateKind.getValue().toUpperCase())[0].codeId);

				if (oPlateSourecMastersResponse.filter(E => E.codeDescEnglish === oPlateSource.getValue().toUpperCase()).length > 0)
					oPlateSourecMastersModel.setProperty("/PlateSourceCode", oPlateSourecMastersResponse.filter(E => E.codeDescEnglish === oPlateSource.getValue().toUpperCase())[0].codeId);

			},

			/**Function use for auto search in the Lookup Plate Color filter
			* @memberof adnoc.vi.vehicleinspection.modone.controller.ServiceTest
			* @version 1.0.0
			* @since 01.01.2025
			* @author MA
			* @fires filterPlateColor
			*/
			filterPlateColor: function (oEvent) {
				let sValue = oEvent.getParameter("value").toLowerCase() + "";
				let oModel = this.getView().getModel('BodyColorMastersModel').getData().results.filter(x => x.codeDescEnglish.toLowerCase().includes(sValue));
				this.getView().getModel("BodyColorMastersModel").setProperty("/items", oModel);
			},

			/**Function for Open CFL plate color
			* @memberof adnoc.vi.vehicleinspection.modone.controller.ServiceTest
			* @version 1.0.0
			* @since 01.01.2025
			* @author MA
			* @fires onloadANPRCapture
			*/
			cflForPlateColor: async function () {
				await this.createNewModelUsingAPI(Constant.GET, '/VehPlateColorMasters', '', 'BodyColorMastersModel');
				this.setCflTitle(this.oi18nModel.getProperty('searchCFL_PlateColor'))
				this.setCflDisplayColumns([Constant.CFL_COLUMN_DESCRIPTION.PlateColorEnglish, Constant.CFL_COLUMN_DESCRIPTION.PlateColorArabic]);
				this.setCflDataColumns(['codeDescEnglish', 'codeDescArabic']);
				this.setCflValueAndDisplay('/bodyColorEnglish', 'codeDescEnglish', '', '');
				this.setCflSearchProperty('codeDescEnglish', 'codeDescArabic');
				this.showCfl('PlateColor', 'BodyColorMastersModel', 'results', this.onClosecflPlateColor.bind(this));

			},

			/** Function for Set CFL value in the model  
			* @memberof adnoc.vi.vehicleinspection.modone.controller.ServiceTest
			* @version 1.0.0
			* @since 01.01.2025
			* @author MA
			* @fires onloadANPRCapture
			*/
			onClosecflPlateColor: function () {
				let oSourceObject = this.getCflObject();
				let oTargetObject = this.getView().getModel("BodyColorMastersModel");
				oTargetObject.setProperty('/colorCode', oSourceObject.codeId);
				oTargetObject.setProperty('/plateColorEnglish', oSourceObject.codeDescEnglish);
				oTargetObject.setProperty('/plateColorArabic', oSourceObject.codeDescArabic);
			},

			/**Function Opne CFL for plate source 
			* @memberof adnoc.vi.vehicleinspection.modone.controller.ServiceTest
			* @version 1.0.0
			* @since 01.01.2025
			* @author MA
			* @fires onSelectedcfl
			*/
			cflForPlateSource: async function () {
				await this.createNewModelUsingAPI(Constant.GET, '/VehPlateSourceMasters', '', 'PlateSourecMastersModel');
				this.setCflTitle(this.oi18nModel.getProperty('searchCFL_PlateSource'))
				this.setCflDisplayColumns([Constant.CFL_COLUMN_DESCRIPTION.PlateSourceEnglish, Constant.CFL_COLUMN_DESCRIPTION.PlateSourceArabic]);
				this.setCflDataColumns(['codeDescEnglish', 'codeDescArabic']);
				this.setCflValueAndDisplay('/CodeDescEnglish', 'codeDescEnglish', '', '');
				this.setCflSearchProperty('codeDescEnglish', 'codeDescArabic');
				this.showCfl('PlateColor', 'PlateSourecMastersModel', 'results', this.onClosecflPlateSource.bind(this),);
			},

			/**Function use for auto search in the Lookup Plate Surce filter
			* @memberof adnoc.vi.vehicleinspection.modone.controller.ServiceTest
			* @version 1.0.0
			* @since 01.01.2025
			* @author MA
			* @fires filterPlateSurce
			*/
			filterPlateSurce: function (oEvent) {
				let sValue = oEvent.getParameter("value").toLowerCase() + "";
				let oModel = this.getView().getModel('PlateSourecMastersModel').getData().results.filter(x => x.codeDescEnglish.toLowerCase().includes(sValue));
				this.getView().getModel("PlateSourecMastersModel").setProperty("/items", oModel);
			},

			/**Function selected value set in the model  
			* @memberof adnoc.vi.vehicleinspection.modone.controller.ServiceTest
			* @version 1.0.0
			* @since 01.01.2025
			* @author MA
			* @fires onSelectedcfl
			*/
			onClosecflPlateSource: function () {
				let oSourceObject = this.getCflObject();
				let oTargetObject = this.getView().getModel("PlateSourecMastersModel");
				oTargetObject.setProperty('/PlateSourceCode', oSourceObject.codeId);
			},

			/**Function use for auto search in the Lookup Plate Kind filter
			* @memberof adnoc.vi.vehicleinspection.modone.controller.ServiceTest
			* @version 1.0.0
			* @since 01.01.2025
			* @author MA
			* @fires filterPlateKind
			*/
			filterPlateKind: function (oEvent) {
				let sValue = oEvent.getParameter("value").toLowerCase() + "";
				let oModel = this.getView().getModel('PlateKindMastersModel').getData().results.filter(x => x.codeDescEnglish.toLowerCase().includes(sValue));
				this.getView().getModel("PlateKindMastersModel").setProperty("/items", oModel);
			},

			/**Function for Open CFL pLate kind
			* @memberof adnoc.vi.vehicleinspection.modone.controller.ServiceTest
			* @version 1.0.0
			* @since 01.01.2025
			* @author MA
			* @fires onloadANPRCapture
			*/
			cflForPLateKind: async function () {
				await this.createNewModelUsingAPI(Constant.GET, '/VehPlateKindMasters', '', 'PlateKindMastersModel');
				this.setCflTitle(this.oi18nModel.getProperty('searchCFL_Platekind'));
				this.setCflDisplayColumns([Constant.CFL_COLUMN_DESCRIPTION.PlateKindEnglish, Constant.CFL_COLUMN_DESCRIPTION.PlateKindArabic]);
				this.setCflDataColumns(['codeDescEnglish', 'codeDescArabic']);
				this.setCflValueAndDisplay('/codeDescEnglish', 'codeDescEnglish', '', '');
				this.setCflSearchProperty('codeDescEnglish', 'codeDescArabic');
				this.showCfl('PlateKind', 'PlateKindMastersModel', 'results', this.onClosecflPLateKind.bind(this));
			},


			/**Function for Set CFL value in the model  
			* @memberof adnoc.vi.vehicleinspection.modone.controller.ServiceTest
			* @version 1.0.0
			* @since 01.01.2025
			* @author MA
			* @fires onloadANPRCapture
			*/
			onClosecflPLateKind: function () {
				let oPlatekind = this.getCflObject();
				let oTargetObject = this.getView().getModel("PlateKindMastersModel");
				oTargetObject.setProperty('/codeId', oPlatekind.codeId);
				oTargetObject.setProperty('/codeDescArabic', oPlatekind.codeDescArabic);
				oTargetObject.setProperty('/codeDescEnglish', oPlatekind.codeDescEnglish);
			},

			//#endregion

			/**Function for goto the create vehicle and customer
			* @memberof adnoc.vi.vehicleinspection.modone.controller.ServiceTest
			* @version 1.0.0
			* @since 01.01.2025
			* @author MA
			* @fires onloadANPRCapture
			*/
			goToCreateVeh: function () {

				this.colorCode = this.getView().getModel("BodyColorMastersModel").getData();
				this.PlatKind = this.getView().getModel("PlateKindMastersModel").getData();
				this.PlaleSource = this.getView().getModel("PlateSourecMastersModel").getData();
				this.sPlateNumber = this.byId(ControlIds.SearchVehicle.PlateNoIdInput).getValue();
				this.sChassisNumber = this.byId(ControlIds.SearchVehicle.ChassisNumberid).getValue();

				let oData = {
					colorCode: this.colorCode.colorCode,
					colorCodeDescArabic: this.colorCode.codeDescArabic,
					colorCodeDescEnglish: this.colorCode.codeDescEnglish,
					PlateSourceCode: this.PlaleSource.PlateSourceCode,
					plateSourceDescArabic: this.PlaleSource.codeDescArabic,
					plateSourceDescEnglish: this.PlaleSource.codeDescEnglish,
					PlatKind: this.PlatKind.codeId,
					platKindDescArabic: this.PlatKind.codeDescArabic,
					platKindDescEnglish: this.PlatKind.codeDescEnglish,
					plateNumber: this.sPlateNumber,
					ChassisNumber: this.sChassisNumber
				};
				let oModel = new JSONModel(oData);
				this.getOwnerComponent().setModel(oModel, "Getdata");
				const oRouter = this.getOwnerComponent().getRouter();
				oRouter.navTo(Constant.CustomerCreate, {}, true);
			},

			/**Function for Fetch data from DP mobility
			* @memberof adnoc.vi.vehicleinspection.modone.controller.ServiceTest
			* @version 1.0.0
			* @since 01.01.2025
			* @author MA
			* @fires triggerADMobilityValidation,onPayloadOfApi,onclickfetchVehicleData,onSelectedcfl
			*/
			onBtnPressAdmobility: async function (oEvent) {
				let oLaneMasterData = Formatter.onLoadGetDataInSessionStorage(Constant.SESSIONSTORAGEKEY.LaneMasterData);
				if (!oLaneMasterData) {
					return MessageToast.show(this.oi18nModel.getProperty('searchVehicleValidationSideAndLane'));
				}
				this.byId(ControlIds.SearchVehicle.EditId).setVisible(true);
				//#region Call function for Dummy plate number and enable button create vehicle & customer
				let bDummyPlateFlag = this.dummyPlateNumberLogic();
				if (bDummyPlateFlag == true) {
					this.byId(ControlIds.SearchVehicle.CustomerSearchId).setEnabled(true);
					return
				}
				//#endregion
				this.onSelectedcfl();
				this.byId(ControlIds.SearchVehicle.SaveId).setVisible(false);
				this.byId(ControlIds.SearchVehicle.EditId).setVisible(true);
				this.byId(ControlIds.SearchVehicle.CustomerTypeId).setEditable(false);
				this.byId(ControlIds.SearchVehicle.CustomerId).setEditable(false);
				this.byId(ControlIds.SearchVehicle.EmailId).setEditable(false);
				this.byId(ControlIds.SearchVehicle.PhoneNoId).setEditable(false);
				let bFlag = this.triggerADMobilityValidation();
				let oButton = oEvent.getSource();
				let oButtonID = oButton.getCustomData();
				oButtonID.forEach(function (dataItem) { oButtonID = dataItem.getKey() });
				if (oButtonID == ControlIds.SearchVehicle.RepestButtonId) {
					let oPlateNumber = this.byId(ControlIds.SearchVehicle.PlateNoIdInput);
					let oPlateColor = this.byId(ControlIds.SearchVehicle.PlateColorid);
					let oPlateSource = this.byId(ControlIds.SearchVehicle.PlateSourceId);
					let oPlateKind = this.byId(ControlIds.SearchVehicle.PlateKindId);
					oPlateNumber.setValue(Constant.REPEATVEHICLE.VEHICLENUMBER);
					oPlateColor.setValue(Constant.REPEATVEHICLE.VEHICLECOLORNAME);
					oPlateSource.setValue(Constant.REPEATVEHICLE.VEHICLESOURCENAME);
					oPlateKind.setValue(Constant.REPEATVEHICLE.VEHICLEKINDNAME);
				}
				if (bFlag == true) {
					const aApiPayload = await this.onPayloadOfApi(Constant.VEHICLECONSTANT.ITCMobility);
					if (oButtonID == ControlIds.SearchVehicle.RepestButtonId) {
						let aDataRepeat = aApiPayload.Payload.getVehicleDetails.getVehicleDetailsRequest.request.PlateInfo
						aDataRepeat.PlateNo = Constant.REPEATVEHICLE.VEHICLENUMBER;
						aDataRepeat.PlateColorCode = Constant.REPEATVEHICLE.VEHICLECOLORCODE;
						aDataRepeat.PlateKindCode = Constant.REPEATVEHICLE.VEHICLEKINDCODE;
						aDataRepeat.PlateTypeCode = Constant.REPEATVEHICLE.PLATETYPECODE;
						aDataRepeat.PlateSourceCode = Constant.REPEATVEHICLE.VEHICLESOURCECODE;
					}
					await this.createNewModelUsingAPI(Constant.POST, '/getVehicleDetailsFromITC', aApiPayload, 'DetailVehicleModel');
					let oResponse = this.getApiResponseObject();
					let oModel = this.getView().getModel('DetailVehicleModel');
					let oData = oModel.getData();
					this.getOwnerComponent().setModel(oModel, "VehicleData");
					//Every time fetch only one vehicle data
					if (oResponse.success) {
						let oCustomerDropDownData = this.getView().getModel('CustomerTypeModel');
						let oTagData = this.getView().getModel('oModelLanding');
						oTagData.setProperty('/formTag', true);
						oTagData.setProperty('/LableTag', false);
						let oVehicleObjectData = oData.results.find(Item => true);
						if (oVehicleObjectData.ErrorEnglishDesc == null || undefined) {
							this.getDataTransferParentToChild(oData);
							let oCustomerInto = oVehicleObjectData.customerInfo;
							this.byId(ControlIds.SearchVehicle.CustomerSearchId).setEnabled(false);
							oVehicleObjectData.registrationDate = Formatter.getDateFromatIn_yyyyMMdd(oVehicleObjectData.registrationDate);
							oVehicleObjectData.registrationExpiryDate = Formatter.getDateFromatIn_yyyyMMdd(oVehicleObjectData.registrationExpiryDate)
							oVehicleObjectData.customertype = oCustomerInto.customerType;
							oModel.setData(oVehicleObjectData);
							this.getView().setModel(oModel, 'DetailVehicleModel');
							if (oCustomerInto) {
								oCustomerDropDownData.setProperty('/SelectedCustomerId', oCustomerInto.customerType);
								oCustomerInto = this.getMaskedCustomerInfo(oCustomerInto);
							}
							let oCustomerInfoModel = new JSONModel(oCustomerInto);
							this.getView().setModel(oCustomerInfoModel, 'CustomerInfoModel');
						}
						else {
							let MasterViewModel = new JSONModel();
							this.getView().setModel(MasterViewModel, "MasterViewModel");
							this.onLoadShowPopup(oResponse.success);
						}
					} else {
						this.onLoadShowPopup(oResponse.success);
					}
				}
			},

			/**Function use for data share parent to child 
			* @memberof adnoc.vi.vehicleinspection.modone.controller.ServiceTest
			* @version 1.0.0
			* @since 01.01.2025
			* @author MA
			* @fires onSelectedcfl
			*/
			getDataTransferParentToChild: function (oRes) {
				let oResponse = oRes.results[0];
				let oReTestSearch = this.getView().getModel("ReTestSearchModel");
				let oRePrintSearch = this.getView().getModel("RePrintSearchModel");
				let oCustomerInfoModel = this.getView().getModel("SalesOrderCardDataModel");
				let oTransferModel = new JSONModel();
				oTransferModel.setData(oRes);
				this.getOwnerComponent().setModel(oTransferModel, "FreshTestForOrderModel");

				// Fetch Customer Detail Info
				if (oResponse.Code === undefined) {
					oCustomerInfoModel.setProperty("/CustomerInfo/emiratesId", oResponse.customerInfo.emiratesId || null);
					oCustomerInfoModel.setProperty("/CustomerInfo/firstName", oResponse.customerInfo.firstName || null);
					oCustomerInfoModel.setProperty("/CustomerInfo/lastName", oResponse.customerInfo.lastName || null);
					oCustomerInfoModel.setProperty("/CustomerInfo/mobileNo", oResponse.customerInfo.mobileNo || null);
					oCustomerInfoModel.setProperty("/CustomerInfo/emailAddress", oResponse.customerInfo.emailAddress || null);
					oCustomerInfoModel.setProperty("/CustomerInfo/commTypeWhatsapp", oResponse.customerInfo.commTypeWhatsapp || false);
					oCustomerInfoModel.setProperty("/CustomerInfo/commTypeMail", oResponse.customerInfo.commTypeMail || false);
					oCustomerInfoModel.setProperty("/CustomerInfo/commTypeSMS", oResponse.customerInfo.commTypeSMS || false);
					oCustomerInfoModel.setProperty("/CustomerInfo/idType", oResponse.customerInfo.idType || null);
					oCustomerInfoModel.setProperty("/CustomerInfo/emiratesFromDate", oResponse.customerInfo.emiratesFromDate
						? oResponse.customerInfo.emiratesFromDate.split("T")[0]
						: null);
					oCustomerInfoModel.setProperty("/CustomerInfo/emiratesToDate", oResponse.customerInfo.emiratesToDate
						? oResponse.customerInfo.emiratesToDate.split("T")[0]
						: null);

					// Deep copy CustomerInfo into CustomerInfoPrev
					let custInfoDetail = oCustomerInfoModel.getProperty("/CustomerInfo");
					let custInfoCopy = JSON.parse(JSON.stringify(custInfoDetail));
					oCustomerInfoModel.setProperty("/CustomerInfoPrev", custInfoCopy);

					oReTestSearch.setProperty("/plateNum", oResponse.plateNumber);
					oReTestSearch.setProperty("/plateColorName", oResponse.plateColorEnglish);
					oReTestSearch.setProperty("/plateColorCode", oResponse.plateColorCode);
					oReTestSearch.setProperty("/plateKindCode", oResponse.plateKindCode);
					oReTestSearch.setProperty("/plateKindName", oResponse.plateKindEnglish);
					oReTestSearch.setProperty("/plateSourceCode", oResponse.plateSourceCode);
					oReTestSearch.setProperty("/plateSourceName", oResponse.plateSourceEnglish);
					oReTestSearch.setProperty("/registrationYear", oResponse.registrationYear);

					oRePrintSearch.setProperty("/plateNum", oResponse.plateNumber);
					oRePrintSearch.setProperty("/plateColorName", oResponse.plateColorEnglish);
					oRePrintSearch.setProperty("/plateColorCode", oResponse.plateColorCode);
					oRePrintSearch.setProperty("/plateKindCode", oResponse.plateKindCode);
					oRePrintSearch.setProperty("/plateKindName", oResponse.plateKindEnglish);
					oRePrintSearch.setProperty("/plateSourceCode", oResponse.plateSourceCode);
					oRePrintSearch.setProperty("/plateSourceName", oResponse.plateSourceEnglish);
					oRePrintSearch.setProperty("/registrationYear", oResponse.registrationYear);

				}
			},

			/**Function for apply validation for filter fields like plate number, plate kind, plate color and source
			* @memberof adnoc.vi.vehicleinspection.modone.controller.ServiceTest
			* @version 1.0.0
			* @since 01.01.2025
			* @author MA
			* @fires onloadANPRCapture
			*/
			triggerADMobilityValidation() {
				let sPlateNumber = this.byId(ControlIds.SearchVehicle.PlateNoIdInput).getValue();
				let sPlateclr = this.byId(ControlIds.SearchVehicle.PlateColorid).getValue();
				let sPlateknd = this.byId(ControlIds.SearchVehicle.PlateKindId).getValue();
				let sPlateSourceValue = this.byId(ControlIds.SearchVehicle.PlateSourceId).getValue();
				let sChassisNo = this.byId(ControlIds.SearchVehicle.ChassisNumberid).getValue();
				if (sChassisNo) {
					return true;
				} else {
					if (!sPlateNumber) {
						MessageToast.show(this.oi18nModel.getProperty('ValidationPLateNumber'));
						return false;
					} else if (!sPlateclr) {
						MessageToast.show(this.oi18nModel.getProperty('ValidationPLatecolor'));
						return false;
					} else if (!sPlateSourceValue) {
						MessageToast.show(this.oi18nModel.getProperty('ValidationPLateSource'));
						return false;
					} else if (!sPlateknd) {
						MessageToast.show(this.oi18nModel.getProperty('ValidationPLatekind'));
						return false;
					} else {
						return true;
					}
				}

			},

			/**Function for create payload 
			* @memberof adnoc.vi.vehicleinspection.modone.controller.ServiceTest
			* @version 1.0.0
			* @since 01.01.2025
			* @author MA
			* @fires onSelectedcfl
			*/
			onPayloadOfApi: async function (ApiName) {
				this.onSelectedcfl();
				this.colorCode = this.getView().getModel("BodyColorMastersModel").getData();
				this.PlatKind = this.getView().getModel("PlateKindMastersModel").getData();
				this.PlaleSource = this.getView().getModel("PlateSourecMastersModel").getData();
				let sPlateKindCode = parseInt(this.PlatKind.codeId, 10);
				let sColorCode = parseInt(this.colorCode.colorCode, 10);
				this.sPlateNumber = this.byId(ControlIds.SearchVehicle.PlateNoIdInput).getValue();
				let sChassisno = this.byId(ControlIds.SearchVehicle.ChassisNumberid).getValue();
				if (sChassisno) {
					this.sPlateNumber = null;
					sColorCode = null
					sPlateKindCode = null
					this.PlaleSource.PlateSourceCode = null
				} else {
					sChassisno = null
				}
				try {
					if (ApiName == Constant.VEHICLECONSTANT.ITCMobility) {
						let oPayload = this.getView().getModel('FetchVehicleModel').getData();
						let oPayloadData = oPayload.Payload.getVehicleDetails.getVehicleDetailsRequest.request.PlateInfo;
						oPayloadData.PlateNo = this.sPlateNumber;
						oPayloadData.PlateColorCode = sColorCode;
						oPayloadData.PlateKindCode = sPlateKindCode;
						oPayloadData.PlateSourceCode = this.PlaleSource.PlateSourceCode;
						oPayload.Payload.getVehicleDetails.getVehicleDetailsRequest.request.ChassisNo = sChassisno;
						return oPayload;
					} else if (ApiName == Constant.VEHICLECONSTANT.FETCHVEHICLEDATA) {
						const cData = {
							FilterDetail: {
								PlateNo: this.sPlateNumber,
								PlateKindCode: sPlateKindCode,
								PlateColorCode: sColorCode,
								PlateSourceCode: this.PlaleSource.PlateSourceCode,
								ChassisNo: sChassisno
							}
						}
						return cData;
					} else {
						return null;
					}
				} catch (error) {
					MessageBox.error(this.oi18nModel.getProperty('searchVehicleMsg_Somethngwrong'));
				}
			},

			/**Function to get the value and set it in the Chassis or Engine model.
			* @memberof adnoc.vi.vehicleinspection.modone.controller.ServiceTest
			* @version 1.0.0
			* @since 01.01.2025
			* @author MA
			* @fires onSelectedcfl
			*/
			onPressServiceTest: async function () {
				let sPlateNumberValid = this.oi18nModel.getProperty('ValidationPLateNumber');
				let sPlateNumber = this.getView().byId(ControlIds.SearchVehicle.PlateNoId).getValue();
				if (!sPlateNumber) {
					MessageBox.warning(sPlateNumberValid);
					return;
				}

				// Store in Global JSON Model
				let oModel = this.getOwnerComponent().getModel("plateModel");
				if (!oModel) {
					oModel = new JSONModel();
					this.getOwnerComponent().setModel(oModel, "plateModel");
				}
				var aPlates = oModel.getProperty("/plates") || [];
				// Prevent duplicate tabs
				if (!aPlates.includes(sPlateNumber)) {
					aPlates.push(sPlateNumber);
				}
				oModel.setProperty("/plates", aPlates);
				var oRouter = this.getOwnerComponent().getRouter();
				oRouter.navTo("ServiceTest");
			},

			/**
			 * Function use for Customer detail maske 
			 * @memberof adnoc.vi.vehicleinspection.modone.controller.Home
			 * @version 1.0.0
			 * @since 10.02.2025
			 * @author AF
			 */
			_getMaskedCustomerInfo(oCustomerInfo) {
				let oUnmask = {
					emailAddress: oCustomerInfo.emailAddress,
					firstName: oCustomerInfo.firstName,
					lastName: oCustomerInfo.lastName,
					mobileNo: oCustomerInfo.mobileNo,
				}
				let oCustomerData = new JSONModel(oUnmask);
				this.getView().setModel(oCustomerData, 'VehicleDataGetModel');

				try {
					if (oCustomerInfo) {
						let oCustomerData = Formatter.getMaskedCustomerData(oCustomerInfo);
						return oCustomerData;
					} else {
						return null;
					}
				} catch (error) {
					MessageBox.error(this.oi18nModel.getProperty('searchVehicleMsg_Somethngwrong'), error.message);
				}

			},

			/**Function is used to check for issues or when data is not found from CPI.
			* @memberof adnoc.vi.vehicleinspection.modone.controller.ServiceTest
			* @version 1.0.0
			* @since 01.01.2025
			* @author MA
			* @fires onloadANPRCapture
			*/
			onLoadShowPopup(success) {
				let sFetchDataFromDb = null;
				try {
					if (success) {
						sFetchDataFromDb = this.oi18nModel.getProperty('home_messageBoxFetchDataFromDB');
					} else {
						sFetchDataFromDb = this.oi18nModel.getProperty('ErrorEnglishDesc');
					}
					MessageBox.confirm(
						sFetchDataFromDb, {
						icon: MessageBox.Icon.INFORMATION,
						title: this.oi18nModel.getProperty('searchVehicleMsg_Confirm'),
						class: "sapUiSizeCompact",
						actions: [MessageBox.Action.YES, MessageBox.Action.NO],
						onClose: function (oAction) {
							if (oAction === Constant.YESANDNO.YES) {
								this.onclickfetchVehicleData();
							}
						}.bind(this)
					});

				} catch (error) {
					MessageBox.error(this.oi18nModel.getProperty('searchVehicleMsg_Somethngwrong'));
				}
			},

			/**Function for Fetch data from BTP
			* @memberof adnoc.vi.vehicleinspection.modone.controller.ServiceTest
			* @version 1.0.0
			* @since 01.01.2025
			* @author MA
			* @fires onSelectedcfl
			*/
			onclickfetchVehicleData: async function () {
				const oPayload = await this.onPayloadOfApi(Constant.VEHICLECONSTANT.FETCHVEHICLEDATA);
				await this.createNewModelUsingAPI(Constant.POST, '/getVehicleDetailsFromBTP', oPayload, 'DetailVehicleModel');
				let oModel = this.getView().getModel('DetailVehicleModel');
				let oVehicleData = oModel.getData();
				this.getDataTransferParentToChild(oVehicleData);
				this.byId(ControlIds.SearchVehicle.CustomerSearchId).setEnabled(false);

				let oVehicleDataResponse = oVehicleData.results[0];

				if (oVehicleDataResponse.Code) {
					MessageToast.show(this.oi18nModel.getProperty('searchVehicleMsg_DataNotFound'));
					this.getView().setModel(oModel, 'CustomerInfoModel');
					this.byId(ControlIds.SearchVehicle.CustomerSearchId).setEnabled(true);
					// this.byId(ControlIds.SearchVehicle.CustomerSearchId).setEnabled(true);
					this.byId(ControlIds.SearchVehicle.EditId).setVisible(false);
				} else {
					let oTagData = this.getView().getModel('oModelLanding');
					oTagData.setProperty('/formTag', true);
					oTagData.setProperty('/LableTag', false);
					oVehicleDataResponse.registrationDate = Formatter.convertV2ODataDateFormart_DD_MM_YYYY(oVehicleDataResponse.registrationDate);
					oVehicleDataResponse.registrationExpiryDate = Formatter.convertV2ODataDateFormart_DD_MM_YYYY(oVehicleDataResponse.registrationExpiryDate)
					let oCustomerInfo = oVehicleDataResponse.customerInfo;
					oVehicleDataResponse.customertype = oCustomerInfo.customerType;
					oModel.setData(oVehicleDataResponse);
					this.getView().setModel(oModel, 'DetailVehicleModel');

					//Get customer data
					if (oCustomerInfo) {
						oCustomerInfo = this._getMaskedCustomerInfo(oVehicleDataResponse.customerInfo);
					}
					let oCustomerInfoModel = new JSONModel(oCustomerInfo);
					this.getView().setModel(oCustomerInfoModel, 'CustomerInfoModel');

				}
			},

			/**
		   * Function use for Clear model 
		   * @memberof adnoc.vi.vehicleinspection.modone.controller.Home
		   * @version 1.0.0
		   * @since 10.02.2025
		   * @fires onLoadClearData
		   * @author AF
		   */
			onLoadClearData: function () {
				let oModel = new JSONModel();
				this.getView().setModel(oModel, "MasterViewModel");
				this.getView().setModel(oModel, "VIRGlobalModel");
				this.getView().setModel(oModel, "DetailVehicleModel");
				this.getView().setModel(oModel, 'CustomerInfoModel');
				this.getView().setModel(oModel, 'oModelLanding');

				this.clearGenericEntryForm();
				this.sPlateNumber = null;
				let oDataModelLanding = this.getView().getModel('oModelLanding');
				oDataModelLanding.setProperty('/DropDownCusomerType', false);
				let oModelLanding = this.getView().getModel('oModelLanding');
				oModelLanding.setProperty('/formTag', false);


			},

			/**Function use for Recapture
			* @memberof adnoc.vi.vehicleinspection.modone.controller.ServiceTest
			* @version 1.0.0
			* @since 01.01.2025
			* @author MA
			* @fires onPressBtnRecapture,onLoadSetDataAnprRecapure
			*/
			onPressBtnRecapture: async function () {
				try {
					let sGetLaneData = this.getView().getModel("oGlobalModel").getData();
					//Get data by selected lane and plant 
					await this.createNewModelUsingAPI(
						Constant.GET,
						`/AnprSiteLaneConfigs?$filter=plantCode eq '${sGetLaneData.PlantCode}' and laneCode eq '${sGetLaneData.LaneCode}'`,
						'',
						'AnprSiteLanemodel'
					);
					let oAnprSiteLane = this.getView().getModel('AnprSiteLanemodel').getData().results[0];
					// when data is return aacording to seleted lane and plant 
					if (oAnprSiteLane) {
						const oPayload = {
							"siteId": oAnprSiteLane.plantCode,
							"sectionId": oAnprSiteLane.laneCode,
							"cameraNumber": oAnprSiteLane.anprCameraNumber
						}
						await this.createNewModelUsingAPI(Constant.POST, '/AnprRecapture', oPayload, 'aRecaptureModel');
						this.lRecaptureData = this.getView().getModel('aRecaptureModel');
						let oResponse = this.getApiResponseObject();
						if (oResponse.success) {
							if (this.lRecaptureData.d.AnprRecapture.statusCode != Constant.APICODE.NotFound) {
								this.onLoadSetDataAnprRecapure(this.lRecaptureData.d.AnprRecapture, Constant.VEHICLECONSTANT.RECAPTURE);
								var sDataUrl = "data:image/jpeg;base64," + this.lRecaptureData.d.AnprRecapture.plateImage;
								this.byId(ControlIds.SearchVehicle.CaptureImg).setSrc(sDataUrl);
							} else {
								MessageBox.show(this.oi18nModel.getProperty('searchVehicleValidationRecaptureDataNotFound'));
							}
						} else {
							MessageBox.error(oResponse.object.statusCode + " " + oResponse.object.message + " " + oResponse.object.statusText);
							return
						}
					} else {
						MessageBox.show(this.oi18nModel.getProperty('searchVehicleValidationSideLaneFound'));
					}
				} catch (error) {
					MessageBox.error(this.oi18nModel.getProperty('searchVehicleValidationErrorRecaptureData') + error.message);
				}
			},

			/**Function use for after fetch data from recapture api set set in the model
			* @memberof adnoc.vi.vehicleinspection.modone.controller.ServiceTest
			* @version 1.0.0
			* @since 01.01.2025
			* @author MA
			* @fires onLoadSetDataAnprRecapure
			*/
			onLoadSetDataAnprRecapure: async function (oPayload, type) {
				try {
					//this.onInputChange(null);
					let oVIRGlobal = this.getView().getModel('VIRGlobalModel');
					let EntryForm = this.getView().getModel('EntryFormDataSourceModel');
					this.colorCode = this.getView().getModel("BodyColorMastersModel");
					this.PlatKind = this.getView().getModel("PlateKindMastersModel");
					this.PlaleSource = this.getView().getModel("PlateSourecMastersModel");

					if (type == Constant.VEHICLECONSTANT.ANPRCAPTURES) {
						if (!oPayload) {
							return
						}
						this.colorCode.setProperty('/colorCode', oPayload.plateColor);
						this.colorCode.setProperty('/plateColorEnglish', oPayload.plateColorDesc);
						this.PlatKind.setProperty('/codeId', oPayload.plateKind);
						this.PlatKind.setProperty('/codeDescEnglish', oPayload.plateKindDesc);

						this.PlaleSource.setProperty('/PlateSourceCode', oPayload.plateSourceCode);
						this.PlaleSource.setProperty('/codeDescEnglish', oPayload.plateSourceDesc);
						this.sPlateNumber = oPayload.plateNumber;
						// Set value for show data on Home Screen  
						oVIRGlobal.setProperty('/PlateNo', oPayload.plateNumber);
						EntryForm.setProperty('/bodyColorEnglish', oPayload.plateColorDesc);
						EntryForm.setProperty('/codeDescEnglish', oPayload.plateKindDesc);
						EntryForm.setProperty('/CodeDescEnglish', oPayload.plateSourceDesc);

					} else if (type == Constant.VEHICLECONSTANT.RECAPTURE) {
						// set property for paylaod search data ITC Mobility
						this.colorCode.setProperty('/colorCode', oPayload.plateColorCode);
						this.colorCode.setProperty('/plateColorEnglish', oPayload.plateColorEnglish);
						this.PlatKind.setProperty('/codeId', oPayload.plateKindCode);
						this.PlatKind.setProperty('/codeDescEnglish', oPayload.plateKindEnglish);
						this.PlaleSource.setProperty('/PlateSourceCode', oPayload.plateSourceCode);
						this.PlaleSource.setProperty('/codeDescEnglish', oPayload.plateSourceCode);

						// set property for paylaod search data ITC Mobility
						this.colorCode.setProperty('/colorCode', oPayload.plateColorCode);
						this.colorCode.setProperty('/plateColorEnglish', oPayload.plateColorEnglish);
						this.PlatKind.setProperty('/codeId', oPayload.plateKindCode);
						this.PlatKind.setProperty('/codeDescEnglish', oPayload.plateKindEnglish);
						this.PlaleSource.setProperty('/PlateSourceCode', oPayload.plateSourceCode);
						this.PlaleSource.setProperty('/codeDescEnglish', oPayload.plateSourceCode);

						// Set value for show data on Home Screen  
						oVIRGlobal.setProperty('/ANPRNo', oPayload.plateNumber);
						oVIRGlobal.setProperty('/PlateNo', oPayload.plateNumber);
						oVIRGlobal.setProperty('/capturedOn', Formatter.getDateFromatIn_ddMMyyyy(oPayload.capturedOn));
						EntryForm.setProperty('/bodyColorEnglish', oPayload.plateColorEnglish);
						EntryForm.setProperty('/codeDescEnglish', oPayload.plateKindEnglish);
						EntryForm.setProperty('/CodeDescEnglish', oPayload.plateSourceEnglish);
						// Set value for show data on Home Screen  
						EntryForm.setProperty('/bodyColorEnglish', oPayload.plateColorEnglish);
						EntryForm.setProperty('/codeDescEnglish', oPayload.plateKindEnglish);
						EntryForm.setProperty('/CodeDescEnglish', oPayload.plateSourceEnglish);


					} else {
						return null;
					}

				} catch (error) {
					MessageBox.error(this.oi18nModel.getProperty('searchVehicleMsg_Somethngwrong'));
				}
			},

			/**
		   * Function for Open Re-Test Fragment
		   * @memberof adnoc.vi.vehicleinspection.modone.controller.Home
		   * @version 1.0.0
		   * @since 10.02.2025
		   * @fires onPressReTest,clearInterval
		   * @author MM
		   */
			onPressReTest: function (oEvent) {

				let oGlobalModel = this.getView().getModel("oGlobalModel");
				let oCard = oEvent.getSource();
				// Step 2: Find the Text control inside the Card
				let oText = oCard.findAggregatedObjects(true, function (oControl) {
					return oControl.isA("sap.m.Text");
				})[0]; // take the first Text found

				// Step 3: Get the text value
				let sInspectionType = oText.getText().replace(/\s+/g, '');
				oGlobalModel.setProperty("/DynamicInspectionType", sInspectionType);
				Formatter.onLoadSetDataInSessionStorage('InspType', sInspectionType);
				this.getView().getModel("ReTestModel").setProperty("/VehOrdInspDetails", []);
				if (!this.RetestFrag) {
					this.RetestFrag = sap.ui.xmlfragment("ReTestColorFrag", "adnoc.vi.vehicleinspection.modone.fragment.view.ReTest", this);
					this.getView().addDependent(this.RetestFrag);
				}
				this.RetestFrag.open();
				this.getView().getModel('BackToSearchVehicleModel').setProperty("/isBackToVehicle", false);
			},

			/**
		   * Function for Close Re-Test Fragment
		   * @memberof adnoc.vi.vehicleinspection.modone.controller.Home
		   * @version 1.0.0
		   * @since 10.02.2025
		   * @fires onCloseRetest
		   * @author MM
		   */
			onCloseRetest: function () {

				const oFragModel = this.getView().getModel("ReTestSearchModel");
				oFragModel.setProperty("/orderNo", '');
				oFragModel.setProperty("/mobileNo", '');
				this.getView().getModel("ReTestModel").setProperty("/VehOrdInspDetails", []);
				// Close and destroy the fragment
				if (this.RetestFrag) {
					this.RetestFrag.close();
					this.RetestFrag.destroy();
					this.RetestFrag = null;
				}
			},

			/**
		   * Function for Search Failed Test from Search API
		   * @memberof adnoc.vi.vehicleinspection.modone.controller.Home
		   * @version 1.0.0
		   * @since 10.02.2025
		   * @fires onpressSearch
		   * @author MM
		   */
			onpressSearch: async function () {

				let oSearchModel = this.getView().getModel("ReTestSearchModel");
				let sPlateNum = oSearchModel.getProperty("/plateNum");
				let sOrderNum = oSearchModel.getProperty("/orderNo");
				let sMobileNum = oSearchModel.getProperty("/mobileNo");
				let sPlateColor = oSearchModel.getProperty("/plateColorCode");
				let sPlateKind = oSearchModel.getProperty("/plateKindCode");
				let sPlateSource = oSearchModel.getProperty("/plateSourceCode");

				if (!sPlateNum && !sOrderNum && !sMobileNum && !sPlateColor && !sPlateKind && !sPlateSource) {
					MessageBox.warning(this.oi18nModel.getProperty('searchVehicleMsg_ForAtLeatOneParameter'));
					return;
				}

				let sUrl = `/getOrdersForRetest?sOrderNo='${sOrderNum}'&sPlateNo='${sPlateNum}'&sMobileNo='${sMobileNum}'&sPlateSourceCode='${sPlateSource}'&sPlateColorCode='${sPlateColor}'&sPlateKindCode='${sPlateKind}'`;
				await this.createNewModelUsingAPI(Constant.GET, sUrl, '', 'GetRetestResModel');

				let oResponse = this.getApiResponseObject();
				if (oResponse.success) {
					if (oResponse.object.results.length === 0) {
						MessageBox.error(this.oi18nModel.getProperty('searchVehicleMsg_DataNotFound'));
						return
					}
					let oModel = this.getView().getModel('GetRetestResModel');
					const aMainResults = oModel.getProperty("/results") || [];
					let aFlattened = [];

					const aWhitelistedFields = FieldWhiteList.VEHICLE_FIELDS;

					aMainResults.forEach((mainEntry) => {
						const aDetails = mainEntry.VehOrdInspDetails?.results || [];

						aDetails.forEach((oDetail) => {
							const aLines = oDetail.vehOrdInspLines?.results || [];

							aLines.forEach((item) => {
								let oMapped = {};
								aWhitelistedFields.forEach(field => {
									oMapped[field] = oDetail[field];
								});
								oMapped.customerInfo = oDetail.customerInfo;
								oMapped.serviceCode = item.materialCode;
								oMapped.serviceCodeReTest = item.serviceCode;
								oMapped.serviceName = item.materialName;
								oMapped.vehicleOrderInspectionLines = item.vehicleOrderInspectionLines;
								oMapped.inspectionType = item.inspectionType;
								oMapped.childOrderNo = item.childOrderNo;
								oMapped.childMaterialCode = item.childMaterialCode;
								oMapped.childSeviceRequestNo = item.childSeviceRequestNo;
								oMapped.childOrderLineNo = item.childOrderLineNo;
								oMapped.orderStatus = mainEntry.orderStatus;
								oMapped.serviceRequestNo = mainEntry.serviceRequestNo;
								oMapped.orderDate = Formatter.getDateFromatIn_ddMMyyyy(oDetail.orderDate);
								aFlattened.push(oMapped);
							});
						});
					});
					this.getView().getModel("ReTestModel").setProperty("/VehOrdInspDetails", aFlattened);
				} else {
					let oRes = JSON.parse(oResponse.object.responseText);
					MessageBox.error(oRes.error?.message?.results);
					return;
				}
			},

			/**
		   * Function for Check Duplicate Material Selection
		   * @memberof adnoc.vi.vehicleinspection.modone.controller.Home
		   * @version 1.0.0
		   * @since 10.02.2025
		   * @fires _hasDuplicateServiceCode
		   * @author MM
		   */

			_hasDuplicateServiceCode: function (arr) {
				let seen = new Set();
				for (let item of arr) {
					if (seen.has(item.serviceCode)) {
						return true; // duplicate found
					}
					seen.add(item.serviceCode);
				}
				return false;
			},

			/**
		   * Function for Check Avalable Material Selection
		   * @memberof adnoc.vi.vehicleinspection.modone.controller.Home
		   * @version 1.0.0
		   * @since 10.02.2025
		   * @fires _hasApplicableServiceCode
		   * @author MM
		   */

			_hasApplicableServiceCode: function (arr) {

				for (let item of arr) {
					if (item.serviceCodeReTest === null) {
						return true; // null found
					}
				}
				return false;
			},

			/**
		   * Function for Button click of Re-Test to go next page
		   * @memberof adnoc.vi.vehicleinspection.modone.controller.Home
		   * @version 1.0.0
		   * @since 10.02.2025
		   * @fires onBtnPressRetest,getPlateDetailForReTest
		   * @author MM
		   */
			onBtnPressRetest: function () {
				let oReTestModel = this.getView().getModel("ReTestModel");
				let oReTestDetailModel = oReTestModel.getProperty("/VehOrdInspDetails");
				let aFilteredData = oReTestDetailModel.filter(item => item.testFlag === true);

				if (aFilteredData.length > 0) {
					if (this._hasDuplicateServiceCode(aFilteredData)) {
						MessageToast.show(this.oi18nModel.getProperty('ReTest_UniqueServiceSelection'));
						return; // stop execution
					}
					if (this._hasApplicableServiceCode(aFilteredData)) {
						MessageBox.warning(this.oi18nModel.getProperty('salesOrder_messageToastRetestNotFound'));
						return; // stop execution
					}
					if (aFilteredData.length <= 10) {
						if (this.RetestFrag) {
							this.RetestFrag.close();
						}
						this.getView().getModel("ReTestModel").setProperty("/VehOrdInspDetails", aFilteredData);
						this.getOwnerComponent().setModel(aFilteredData, "ReTestForOrderModel");

						aFilteredData.forEach((item, i) => {
							let sPlateNum = item.plateNumber; // Fix: `item[i]` → `item`
							let oModel = this.getOwnerComponent().getModel("plateModel");
							let aPlates = [];
							if (!oModel) {
								oModel = new JSONModel();
								this.getOwnerComponent().setModel(oModel, "plateModel");
							}

							//Prevent duplicates based on plateNumber
							const exists = aPlates.some(obj => obj.plateNumber === sPlateNum);
							if (!exists) {
								//aPlates.push({ plateNumber: sPlateNum });
								aPlates.push(sPlateNum);
							}
							this.getPlateDetailForReTest();
							oModel.setProperty("/plates", aPlates);
						});
						//oGlobalModel.setProperty("/isBackToOrder", true);
						let oRouter = UIComponent.getRouterFor(this);
						oRouter.navTo(Constant.Services, { from: Constant.TESTMODE.RETEST });
					} else {
						MessageBox.warning(this.oi18nModel.getProperty('searchVehicleMsg_ForOnly5ReTest'));
					}
				} else {
					MessageBox.warning(this.oi18nModel.getProperty('searchVehicleMsg_ForAtLeastOneRecord'));
				}

			},

			/**
			 * Function for Check which Test will be perform as Re-Test
			 * @memberof adnoc.vi.vehicleinspection.modone.controller.Home
			 * @version 1.0.0
			 * @since 10.02.2025
			 * @fires onSelectReTest
			 * @author MM
			 */
			onSelectReTest: function (oEvent) {
				const oCheckBox = oEvent.getSource();
				const bSelected = oCheckBox.getSelected();
				const oContext = oCheckBox.getBindingContext("ReTestModel");
				const oModel = this.getView().getModel("ReTestModel");
				const aResults = oModel.getProperty("/VehOrdInspDetails") || [];

				let sProp = "";
				const aCustomData = oCheckBox.getCustomData();
				if (aCustomData && aCustomData.length) {
					const oPropData = aCustomData.find(cd => cd.getKey() === "prop");
					if (oPropData) {
						sProp = oPropData.getValue();
					}
				}

				if (!sProp) {
					return;
				}

				if (sProp === "selectAll") {
					aResults.forEach((_, iIndex) => {
						oModel.setProperty(`results/${iIndex}/testFlag`, bSelected);
					});
					oModel.setProperty("results/0/selectAll", bSelected); // Optional: depends on your logic
				} else if (sProp === "testFlag") {
					if (!oContext) {
						return;
					}
					const sPath = oContext.getPath();
					oModel.setProperty(`${sPath}/testFlag`, bSelected);
				}
				// Filter only selected entries
				const aSelectedItems = aResults.filter(item => item.testFlag === true);
			},


			/**
			 * Function for Clear Data from filter
			 * @memberof adnoc.vi.vehicleinspection.modone.controller.Home
			 * @version 1.0.0
			 * @since 10.02.2025
			 * @fires onBtnPressClear
			 * @author MM
			 */
			onBtnPressClear: function () {
				const oFragModel = this.getView().getModel("ReTestSearchModel");
				oFragModel.setProperty("/orderNo", '');
				oFragModel.setProperty("/mobileNo", '');
			},

			/**
			 * Function for get Plate Detail of vehicle
			 * @memberof adnoc.vi.vehicleinspection.modone.controller.Home
			 * @version 1.0.0
			 * @since 10.02.2025
			 * @fires getPlateDetailForReTest
			 * @author MM
			 */
			getPlateDetailForReTest: async function () {
				let oGlobalModel = this.getView().getModel("oGlobalModel");
				let oReTestCompleteModel = this.getView().getModel("ReTestModel");
				let aMainResults = oReTestCompleteModel.getProperty("/VehOrdInspDetails");
				let oAllPlateReTest = {};
				let plateNumber;
				const aFields = FieldWhiteList.VEHICLE_FIELDS;
				aMainResults.forEach((oDetail) => {
					plateNumber = oDetail.plateNumber;
					const oPlateData = {};
					aFields.forEach((sField) => {
						oPlateData[sField] = oDetail[sField];
					});

					// Apply custom formatter only to orderDate
					oPlateData.orderDate = Formatter.getDateFromatIn_ddMMyyyy(oDetail.orderDate);

					// Finally store in structure
					oAllPlateReTest[plateNumber] = oPlateData;


				});
				let oVehicleData = oAllPlateReTest[plateNumber]; // like oData["90588"]
				// Set entire model to store data per plateNumber
				const oModel = new JSONModel(oAllPlateReTest);
				this.getOwnerComponent().setModel(oModel, "GetPlateDataModel");
				oGlobalModel.setProperty("/PlateSource", oVehicleData.plateSourceEnglish);
				oGlobalModel.setProperty("/PlateSourceCode", oVehicleData.plateSourceCode);
				oGlobalModel.setProperty("/VehicleType", oVehicleData.typeCode);
				oGlobalModel.setProperty("/VehicleYear", oVehicleData.registrationYear);
			},

			/**
			* Function use for ANPR capture every 5 sec.. call api 
			* @memberof adnoc.vi.vehicleinspection.modone.controller.Home
			* @version 1.0.0
			* @since 10.02.2025
			* @fires onloadANPRCapture
			* @author MF
			*/
			onloadANPRCapture: async function () {
				try {
					if (!this.sPlateNumber) {
						this.sGetLaneData = this.getLaneDetails('selectedItemKey');
						await this.createNewModelUsingAPI(
							Constant.GET,
							`/AnprCaptures?$filter=plantCode eq '${this.sGetLaneData.plantCode}' and laneCode eq '${this.sGetLaneData.laneValue}' and usedFlag eq 'N' &$orderby=captureDate desc&$top=1`,
							'',
							'AnprCapturesModel'
						);
						let aAnprCaptures = this.getView().getModel('AnprCapturesModel').getData().results[0];
						this.onLoadSetDataAnprRecapure(aAnprCaptures, 'AnprCaptures');

						if (aAnprCaptures) {

							let payload = { "usedFlag": 'Y' }
							await this.createNewModelUsingAPI(
								Constant.PATCH,
								`/AnprCaptures('${aAnprCaptures.anprCapturesUUID}')`,
								payload,
								'AnprCapturesModel'
							);
						}
					}

				} catch (error) {
					MessageBox.error(this.oi18nModel.getProperty('searchVehicleMsg_Somethngwrong'));
				}
			},


			/**
		   * Function use for Dummy plate number logic
		   * @memberof adnoc.vi.vehicleinspection.modone.controller.Home
		   * @version 1.0.0
		   * @since 10.02.2025
		   * @fires 
		   * @author AF
		   */
			dummyPlateNumberLogic: function () {
				try {
					let bDummyflag = false;
					let DummyPlateNumber = Constant.DUMMYPLATENUMBER;
					let oPlateNumber = this.getView().getModel('VIRGlobalModel').getData();
					let oPlateColor = this.getView().getModel('EntryFormDataSourceModel').getData();
					DummyPlateNumber.some(Item => {
						if (
							Item.DummyPLateNo == oPlateNumber.PlateNo &&
							Constant.DummyNumberValue.bodyColorEnglish == oPlateColor.bodyColorEnglish &&
							Constant.DummyNumberValue.PlateSource == oPlateColor.CodeDescEnglish &&
							Constant.DummyNumberValue.PlateKind == oPlateColor.codeDescEnglish
						) {
							DummyPlateNumber = [];
							bDummyflag = true;
						}
						return false;
					});
					return bDummyflag;
				} catch (error) {
					MessageBox.error(this.oi18nModel.getProperty('searchVehicleMsg_Somethngwrong'));
				}
			},

			/**
		   * Function use for navigate search certificate 
		   * @memberof adnoc.vi.vehicleinspection.modone.controller.Home
		   * @version 1.0.0
		   * @since 07.23.2025
		   * @fires 
		   * @author AF
		   */
			onPressGridClickRetrieveVehicle: async function () {
				let oRouter = this.getOwnerComponent().getRouter();
				oRouter.navTo(Constant.CertificateSearch, { from: Constant.VEHICLECONSTANT.CERTIFICATEVEHICLE });
				this.getView().getModel('BackToSearchVehicleModel').setProperty("/isBackToVehicle", false);
			},

			/**
		   * Function use for Show image
		   * @memberof adnoc.vi.vehicleinspection.modone.controller.Home
		   * @version 1.0.0
		   * @since 07.23.2025
		   * @fires 
		   * @author AF
		   */
			onPressGridListShowImage: async function (oEvent) {
				try {
					var oSrc = oEvent.getSource().getSrc();
					if (!this._oDialog) {
						this._oDialog = new Dialog({
							title: this.oi18nModel.getProperty('searchVehicle_ImagePreview'),
							contentWidth: Constant.VEHICLECONSTANT.CONTENTWIDTH,
							contentHeight: Constant.VEHICLECONSTANT.CONTENTHEIGHT,
							verticalScrolling: false,
							horizontalScrolling: false,
							content: [
								new Image({
									src: oSrc,
									width: Constant.VEHICLECONSTANT.WIDTH,
									height: Constant.VEHICLECONSTANT.HEIGHT,
									densityAware: false
								})
							],
							beginButton: new Button({
								text: this.oi18nModel.getProperty('Close'),
								press: function () {
									this._oDialog.close();
								}.bind(this)
							})
						});
						this.getView().addDependent(this._oDialog);
					} else {
						this._oDialog.getContent()[0].setSrc(oSrc);
					}
					this._oDialog.open();

				} catch (error) {
					MessageBox.error(this.oi18nModel.getProperty('searchVehicleMsg_Somethngwrong'));
				}
			},

			/**
		   * Function use for fetch center data 
		   * @memberof adnoc.vi.vehicleinspection.modone.controller.Home
		   * @version 1.0.0
		   * @since 07.23.2025
		   * @author AF
		   */
			onloadeFetchSideCenter: async function () {
				var oItemOutCen = this.byId(ControlIds.SearchVehicle.GridListItemOutsideCenterId);
				var oItemOnCen = this.byId(ControlIds.SearchVehicle.GridListItemOnlineServiceId);
				var oItemInCen = this.byId(ControlIds.SearchVehicle.GridListItemInsideCenterId);
				let oSideCenterModel = Formatter.onLoadGetDataInSessionStorage(Constant.SESSIONSTORAGEKEY.SideCenterData);
				let BusinessData = Formatter.onLoadGetDataInSessionStorage(Constant.SESSIONSTORAGEKEY.BusinessData);
				this.getView().getModel("oGlobalModel").setProperty("/EmployeeData", BusinessData);
				if (!oSideCenterModel) {
					MessageToast.show(this.oi18nModel.getProperty('searchVehicleValidationEmployeDataNotFound'));
				}

				let oBusinessData = new JSONModel(BusinessData);
				this.getView().setModel(oBusinessData, 'oModelbusiness');

				const oCenterTypeToDisabledItems = {
					InsideCenter: [oItemOutCen, oItemOnCen],
					OutsideCenter: [oItemInCen, oItemOnCen],
					OnlineCenter: [oItemInCen, oItemOutCen]
				};
				const aDisabledItems = oCenterTypeToDisabledItems[oSideCenterModel.TYPE];
				if (aDisabledItems) {
					aDisabledItems.forEach(item => item.addStyleClass("disabledItem"));
				} else {
					oItemInCen.addStyleClass("disabledItem")
					MessageBox.error(this.oi18nModel.getProperty('searchVehicleValidationCenterNotFound'));
				}
				this.getSalesArea();
			},

			/**
		   * Function use for get Sales Area
		   * @memberof adnoc.vi.vehicleinspection.modone.controller.Home
		   * @version 1.0.0
		   * @since 07.23.2025
		   * @author AF
		   */
			getSalesArea: async function () {

				let oSideCenterData = Formatter.onLoadGetDataInSessionStorage('SideCenterData');
				let oGlobalModel = this.getView().getModel("oGlobalModel");
				let orderType = '';
				if (oSideCenterData.TYPE === Constant.InsideCenter || oSideCenterData.TYPE === Constant.OutSideCenter) {
					orderType = Constant.OrderZVSO
				} else {
					orderType = Constant.OrderZVOO
				}

				await this.createNewModelUsingAPI(
					Constant.GET,
					`/SalesAreaMasters?$filter=documentType eq '${orderType}'`,
					"",
					'oSalesAreaModel'
				);
				let oSideCenterModel = this.getView().getModel("oSalesAreaModel").getData().results;
				oGlobalModel.setProperty("/SalesArea", oSideCenterModel);

			},

			/**
		   * Function use for Nav to
		   * @memberof adnoc.vi.vehicleinspection.modone.controller.Home
		   * @version 1.0.0
		   * @since 07.23.2025
		   * @author AF
		   */
			onVBoxPress: async function () {
				let oRouter = this.getOwnerComponent().getRouter();
				oRouter.navTo('RouteCertificateSearch');
			},

			/**
		   * Function use for Live Change
		   * @memberof adnoc.vi.vehicleinspection.modone.controller.Home
		   * @version 1.0.0
		   * @since 07.23.2025
		   * @author AF
		   */
			onLiveChange: function (oEvent) {
				const oInput = oEvent.getSource();
				let sValue = oEvent.getParameter("value");
				sValue = sValue.replace(/(?!^\+)[^\d]/g, "");

				if (sValue.length > 10) {
					sValue = sValue.substring(0, 16);
				}
				oInput.setValue(sValue);
			},

			/**
		   * Function use for onLoadSetVehcilePrevisousData
		   * @memberof adnoc.vi.vehicleinspection.modone.controller.Home
		   * @version 1.0.0
		   * @since 07.23.2025
		   * @author AF
		   */
			onLoadSetVehcilePrevisousData() {
				let oVehicleData = this.getView().getModel('BackToVehicleDataModel');
				if (oVehicleData) {
					let bFlagAddButton = oVehicleData.getProperty('/BackToSearchVehicle');
					if (bFlagAddButton) {
						oVehicleData = oVehicleData.getData();
						this.getView().getModel('VIRGlobalModel').setProperty('/PlateNo', oVehicleData.plateNumber);
						let oResourceModel = this.getView().getModel('EntryFormDataSourceModel');
						oResourceModel.setProperty('/bodyColorEnglish', oVehicleData.plateColorEnglish);
						oResourceModel.setProperty('/CodeDescEnglish', oVehicleData.plateSourceEnglish);
						oResourceModel.setProperty('/codeDescEnglish', oVehicleData.plateKindEnglish);
						oVehicleData.customertype = oVehicleData.customerInfo.customerType;
						oVehicleData.manufacturingYear = oVehicleData.manufacturingYear;
						let oVehicleDataModel = new JSONModel(oVehicleData);
						let oCustomerModel = new JSONModel(oVehicleData.customerInfo);
						this.getView().setModel(oVehicleDataModel, 'DetailVehicleModel');
						this.getView().setModel(oCustomerModel, 'CustomerInfoModel');
						this.byId(ControlIds.SearchVehicle.EditId).setVisible(true);
						this.getView().getModel('oModelLanding').setProperty('/formTag', true);
						this.getView().getModel('oModelLanding').setProperty('/LableTag', false);
						this.getView().getModel('oGlobalModel').setProperty("/isBackToOrder", true);
					}
				}
			},

			/**
		   * Function use for if use change the lane 
		   * @memberof adnoc.vi.vehicleinspection.modone.controller.Home
		   * @version 1.0.0
		   * @since 07.23.2025
		   * @author AF
		   */
			onLoadDisableControlInRecapture() {
				let oGlobalModel = this.getView().getModel("oGlobalModel").getData();
				let aLaneData = Formatter.onLoadGetDataInSessionStorage(Constant.SESSIONSTORAGEKEY.LaneMasterData);
				let oItemANPRCapture = this.byId(ControlIds.SearchVehicle.GridListItemRecaptureId);
				let oItemANPRCaptureData = this.byId(ControlIds.SearchVehicle.GridListItemRecaptureDataId);
				if (oGlobalModel.anprCameraStatus == '' || oGlobalModel.anprCameraStatus == null) {
					oGlobalModel.anprCameraStatus = aLaneData[0].anprCameraStatus;
				}

				if (oGlobalModel) {
					if (oGlobalModel.anprCameraStatus === Constant.LaneStatus.Live) {
						oItemANPRCapture.removeStyleClass("disabledItem");
						oItemANPRCaptureData.removeStyleClass("disabledItem");
					} else {
						oItemANPRCapture.addStyleClass("disabledItem");
						oItemANPRCaptureData.addStyleClass("disabledItem");

					}
				}

				//If Business Date and Shift are not visible on the screen, then show all test tils disable.
				let oFreshCardId = this.byId(ControlIds.SearchVehicle.GridFreshCardId);
				let oPermitCardid = this.byId(ControlIds.SearchVehicle.GridPermitCardid);
				let oTransfersCardId = this.byId(ControlIds.SearchVehicle.GridTransfersCardId);
				let oAccessoriesCardId = this.byId(ControlIds.SearchVehicle.GridAccessoriesCardId);
				let oChangeInfoCardId = this.byId(ControlIds.SearchVehicle.GridChangeInfoCardId);
				let oReTestCardId = this.byId(ControlIds.SearchVehicle.GridReTestCardId);
				let oAllServiceCardId = this.byId(ControlIds.SearchVehicle.GridAllServiceCardId);


				let oBusinessData = this.getView().getModel('oModelbusiness');

				if (!oBusinessData.getData().BusinessDate && !oBusinessData.getData().empShift) {
					oFreshCardId.addStyleClass('disabledItem');
					oPermitCardid.addStyleClass('disabledItem');
					oTransfersCardId.addStyleClass('disabledItem');
					oAccessoriesCardId.addStyleClass('disabledItem');
					oChangeInfoCardId.addStyleClass('disabledItem');
					oReTestCardId.addStyleClass('disabledItem');
					oAllServiceCardId.addStyleClass('disabledItem');
				} else {
					oFreshCardId.removeStyleClass('disabledItem');
					oPermitCardid.removeStyleClass('disabledItem');
					oTransfersCardId.removeStyleClass('disabledItem');
					oAccessoriesCardId.removeStyleClass('disabledItem');
					oChangeInfoCardId.removeStyleClass('disabledItem');
					oReTestCardId.removeStyleClass('disabledItem');
					oAllServiceCardId.removeStyleClass('disabledItem');
				}

			},

			/**
		  * Open All Service Dialog
		  * @memberof adnoc.vi.vehicleinspection.modone.controller.Home
		  * @version 1.0.0
		  * @since 10.02.2025
		  * @fires onBtnPressAllServices
		  * @author MM
		  */

			onBtnPressAllServices: function () {
				if (!this.allServiceFlag) {
					this.allServiceFlag = sap.ui.xmlfragment("allServiceDialog", "adnoc.vi.vehicleinspection.modone.fragment.view.AllServices", this);
					this.getView().addDependent(this.allServiceFlag);
				}
				this.allServiceFlag.open();
			},

			/**
		  * Close All Service Dialog
		  * @memberof adnoc.vi.vehicleinspection.modone.controller.Home
		  * @version 1.0.0
		  * @since 10.02.2025
		  * @fires onBtnPressCloseAllService
		  * @author MM
		  */

			onBtnPressCloseAllService: async function () {
				if (this.allServiceFlag) {
					this.allServiceFlag.close();
				}
			},

			/**
		   * Function for Open Re-Print Fragment
		   * @memberof adnoc.vi.vehicleinspection.modone.controller.Home
		   * @version 1.0.0
		   * @since 10.02.2025
		   * @fires onPressRePrint,clearInterval
		   * @author MM
		   */
			onPressRePrint: function (oEvent) {

				let oGlobalModel = this.getView().getModel("oGlobalModel");
				let oCard = oEvent.getSource();
				// Step 2: Find the Text control inside the Card
				let oText = oCard.findAggregatedObjects(true, function (oControl) {
					return oControl.isA("sap.m.Text");
				})[0]; // take the first Text found

				// Step 3: Get the text value
				let sInspectionType = oText.getText().replace(/\s+/g, '');
				oGlobalModel.setProperty("/DynamicInspectionType", sInspectionType);
				Formatter.onLoadSetDataInSessionStorage('InspType', sInspectionType);
				this.getView().getModel("RePrintModel").setProperty("/VehOrdInspDetails", []);
				if (!this.RePrintFrag) {
					this.RePrintFrag = sap.ui.xmlfragment("RePrintColorFrag", "adnoc.vi.vehicleinspection.modone.fragment.view.RePrint", this);
					this.getView().addDependent(this.RePrintFrag);
				}
				this.RePrintFrag.open();
				this.getView().getModel('BackToSearchVehicleModel').setProperty("/isBackToVehicle", false);
			},

			/**
		   * Function for Close Re-Print Fragment
		   * @memberof adnoc.vi.vehicleinspection.modone.controller.Home
		   * @version 1.0.0
		   * @since 10.02.2025
		   * @fires onCloseRePrint
		   * @author MM
		   */
			onCloseRePrint: function () {

				const oFragModel = this.getView().getModel("RePrintSearchModel");
				oFragModel.setProperty("/orderNo", '');
				oFragModel.setProperty("/mobileNo", '');
				this.getView().getModel("RePrintModel").setProperty("/VehOrdInspDetails", []);
				// Close and destroy the fragment
				if (this.RePrintFrag) {
					this.RePrintFrag.close();
					this.RePrintFrag.destroy();
					this.RePrintFrag = null;
				}
			},

			/**
		   * Function for Search Print Data from Search API
		   * @memberof adnoc.vi.vehicleinspection.modone.controller.Home
		   * @version 1.0.0
		   * @since 10.12.2025
		   * @fires onPressRePrintSearch
		   * @author MM
		   */
			onPressRePrintSearch: async function () {

				let oSearchModel = this.getView().getModel("RePrintSearchModel");
				let sPlateNum = oSearchModel.getProperty("/plateNum");
				let sOrderNum = oSearchModel.getProperty("/orderNo");
				let sMobileNum = oSearchModel.getProperty("/mobileNo");
				let sPlateColor = oSearchModel.getProperty("/plateColorCode");
				let sPlateKind = oSearchModel.getProperty("/plateKindCode");
				let sPlateSource = oSearchModel.getProperty("/plateSourceCode");

				if (!sPlateNum && !sOrderNum && !sMobileNum && !sPlateColor && !sPlateKind && !sPlateSource) {
					MessageBox.warning(this.oi18nModel.getProperty('searchVehicleMsg_ForAtLeatOneParameter'));
					return;
				}

				let sUrl = `/getOrdersForRetest?sOrderNo='${sOrderNum}'&sPlateNo='${sPlateNum}'&sMobileNo='${sMobileNum}'&sPlateSourceCode='${sPlateSource}'&sPlateColorCode='${sPlateColor}'&sPlateKindCode='${sPlateKind}'`;
				await this.createNewModelUsingAPI(Constant.GET, sUrl, '', 'GetRePrintResModel');

				let oResponse = this.getApiResponseObject();
				if (oResponse.success) {
					if (oResponse.object.results.length === 0) {
						MessageBox.error(this.oi18nModel.getProperty('searchVehicleMsg_DataNotFound'));
						return
					}
					let oModel = this.getView().getModel('GetRePrintResModel');
					const aMainResults = oModel.getProperty("/results") || [];
					let aFlattened = [];

					const aWhitelistedFields = FieldWhiteList.VEHICLE_FIELDS;

					aMainResults.forEach((mainEntry) => {
						const aDetails = mainEntry.VehOrdInspDetails?.results || [];

						aDetails.forEach((oDetail) => {
							const aLines = oDetail.vehOrdInspLines?.results || [];

							aLines.forEach((item) => {
								let oMapped = {};
								aWhitelistedFields.forEach(field => {
									oMapped[field] = oDetail[field];
								});
								oMapped.customerInfo = oDetail.customerInfo;
								oMapped.serviceCode = item.materialCode;
								oMapped.serviceCodeReTest = item.serviceCode;
								oMapped.serviceName = item.materialName;
								oMapped.vehicleOrderInspectionLines = item.vehicleOrderInspectionLines;
								oMapped.inspectionType = item.inspectionType;
								oMapped.childOrderNo = item.childOrderNo;
								oMapped.childMaterialCode = item.childMaterialCode;
								oMapped.childSeviceRequestNo = item.childSeviceRequestNo;
								oMapped.childOrderLineNo = item.childOrderLineNo;
								oMapped.vehOrdInspLinesTestChars = item.vehOrdInspLinesTestChars;
								oMapped.orderStatus = mainEntry.orderStatus;
								oMapped.serviceRequestNo = mainEntry.serviceRequestNo;
								oMapped.orderDate = Formatter.getDateFromatIn_ddMMyyyy(oDetail.orderDate);
								aFlattened.push(oMapped);
							});
						});
					});
					this.getView().getModel("RePrintModel").setProperty("/VehOrdInspDetails", aFlattened);
				} else {
					let oRes = JSON.parse(oResponse.object.responseText);
					MessageBox.error(oRes.error?.message?.results);
					return;
				}
			},

			/**
			 * Function for Clear Print Data from filter
			 * @memberof adnoc.vi.vehicleinspection.modone.controller.Home
			 * @version 1.0.0
			 * @since 10.12.2025
			 * @fires onBtnPressPrintClear
			 * @author MM
			*/
			onBtnPressPrintClear: function () {
				const oFragModel = this.getView().getModel("RePrintSearchModel");
				oFragModel.setProperty("/orderNo", '');
				oFragModel.setProperty("/mobileNo", '');
			},

			/**
			 * Function for Check which Test will be perform as Re-Test
			 * @memberof adnoc.vi.vehicleinspection.modone.controller.Home
			 * @version 1.0.0
			 * @since 10.02.2025
			 * @fires onSelectRePrintRow
			 * @author MM
			*/
			onSelectRePrintRow: function (oEvent) {
				const oCheckBox = oEvent.getSource();
				const bSelected = oCheckBox.getSelected();
				const oContext = oCheckBox.getBindingContext("RePrintModel");
				const oModel = this.getView().getModel("RePrintModel");
				const aResults = oModel.getProperty("/VehOrdInspDetails") || [];

				// Extract customData "prop"
				let sProp = "";
				const aCustomData = oCheckBox.getCustomData();
				if (aCustomData?.length) {
					const oPropData = aCustomData.find(cd => cd.getKey() === "prop");
					if (oPropData) {
						sProp = oPropData.getValue();
					}
				}

				// Only react when prop = testFlag
				if (sProp !== "testFlag" || !oContext) {
					return;
				}

				const sPath = oContext.getPath();

				// STEP 1 — Uncheck all rows (force single-select)
				aResults.forEach((item, index) => {
					oModel.setProperty(`/VehOrdInspDetails/${index}/testFlag`, false);
				});

				// STEP 2 — Check only the clicked row
				if (bSelected) {
					oModel.setProperty(`${sPath}/testFlag`, true);
				}

				// STEP 3 — Store selected row globally
				const updatedResults = oModel.getProperty("/VehOrdInspDetails");
				const selectedRow = updatedResults.find(item => item.testFlag === true) || null;

				_selectedReprintRow = selectedRow;
			},

			/**
			 * To show the service test in pdf format
			 * @memberof adnoc.vi.vehicleinspection.modone.controller.ServiceTest
			 * @version 1.0.0
			 * @since 19.05.2025
			 * @fires _createPrintPayload
			 * @author RK
			 */
			_createPrintPayload: function (aLineData) {

				let sApplicabelReportName = "";

				if (aLineData?.vehOrdInspLinesTestChars?.results) {
					aLineData.vehOrdInspLinesTestChars.results.some(item => {

						switch (item.applicableTestName) {
							case Constant.TESTTYPE.COMPREHENSIVE:
							case Constant.TESTTYPE.TRAFFIC:
							case Constant.TESTTYPE.ESMA:
							case Constant.TESTTYPE.PERMIT:
							case Constant.TESTTYPE.VEHICLE_CERTIFICATE:
							case Constant.TESTTYPE.MODIFIED:
							case Constant.TESTTYPE.ISSUE_CERTIFICATE:
								sApplicabelReportName = item.applicableTestName;
								return true; // exit loop early
						}
						return false;
					});
				}

				return {
					attachmentGuId: aLineData.attachmentGuId || null,
					serviceRequestNo: aLineData.serviceRequestNo,
					plateNo: aLineData.plateNumber,
					chasisNumber: aLineData.chasisNumber,
					testName: sApplicabelReportName,
					orderLineNo: aLineData.childOrderLineNo?.toString(),
					vehicleOrderInspectionLines: aLineData.vehicleOrderInspectionLines
				};
			},

			/**
		   * Function for Print Button
		   * @memberof adnoc.vi.vehicleinspection.modone.controller.Home
		   * @version 1.0.0
		   * @since 10.12.2025
		   * @fires onPressRePrintSearch
		   * @author MM
		   */
			onPressPrintButton: async function () {

				if (!_selectedReprintRow) {
					MessageToast.show(this.oi18nModel.getProperty("RePrint_SelectRow"));
					return;
				}

				const payload = this._createPrintPayload(_selectedReprintRow);

				await this.createNewModelUsingAPI(
					Constant.POST,
					'/previewTestCertificate',
					payload,
					'printResponse'
				);
				const oRes = this.getApiResponseObject();
				if (oRes.success) {
					let oResPrint = this.getView().getModel("printResponse");
					let aResDataPrint = oResPrint.getData();
					let sBase64 = aResDataPrint.previewTestCertificate.base64PDF;



					// const oViewPrint = this.getView();
					try {
						if (!sBase64 || typeof sBase64 !== "string" || sBase64.trim() === "") {
							MessageBox.error(this.oi18nModel, getProperty("searchVehicleMsg_PDFNotAvailable"));
							return;
						}

						//this.onOpenPDF(sBase64);

						//const sBase64PDF = "data:application/pdf;base64," + sBase64;
						let byteCharacters = atob(sBase64);
						let byteNumbers = Array.from(byteCharacters, char => char.charCodeAt(0));
						let byteArray = new Uint8Array(byteNumbers);
						let blob = new Blob([byteArray], { type: 'application/pdf' });
						let sBlobUrl = URL.createObjectURL(blob);

						// Use PDFViewer for desktop
						var oPDFViewer = new PDFViewer();
						this.getView().addDependent(oPDFViewer);
						oPDFViewer.setSource(sBlobUrl);
						oPDFViewer.open();
					} catch (err) {
						MessageBox.error(this.oi18nModel.getProperty("searchVehicleMsg_ExpectedErrorOccurred"));
					}
				} else {
					let oResponse = JSON.parse(oRes.object.responseText);
					MessageBox.error(oResponse.error?.message?.value);
					return;
				}


			}
		});
	})