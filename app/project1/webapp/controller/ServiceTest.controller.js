sap.ui.define([
	'adnoc/vi/vehicleinspection/core/generic/genericentryform',
	"sap/ui/core/UIComponent",
	'sap/ui/core/Fragment',
	'sap/ui/model/json/JSONModel',
	'sap/m/MessageToast',
	'adnoc/vi/vehicleinspection/modone/constants/Constant',
	'adnoc/vi/vehicleinspection/modone/formatter/Formatter',
	'sap/m/MessageBox',
	'sap/m/Dialog',
	'sap/m/Image',
	'sap/m/PDFViewer',
	"sap/ui/layout/library"
], function (genericentryform, UIComponent, Fragment, JSONModel, MessageToast, Constant, Formatter, MessageBox, Dialog, Image, PDFViewer, layoutLibrary) {
	"use strict";
	let sVehicleGUID = '';
	let testStatus;
	let charStatusData;
	let buttonId = '';
	let oCflFilterObject = undefined;
	let sTestInspectedUserName = "Admin";
	let _aBase64FilesPermit = [];
	let sTrafficComment = '';
	let oFileTypesConfig = {
		aAllowedFileTypes: [
			'jpeg',
			'jpg',
			'png',
			'PNG'
		]
	};
	let comprehensiveComment;

	let sFacingMode = "environment"
	var CellColorSet = layoutLibrary.BlockLayoutCellColorSet;
	let oPermitfile;
	let oi18nModel;
	return genericentryform.extend("adnoc.vi.vehicleinspection.modone.controller.ServiceTest", {
		stream: null,
		cameraFacingMode: "user", // Default to front camera
		constructor: function () {

		},

		onInit: async function () {
			genericentryform.prototype.onInit.apply(this, arguments);
			let oViewModel = new JSONModel({
				selectedOption: "",
				cflType: "",
				showValueHelp: false,
				showEmiratesID: false
			});
			this.getView().setModel(oViewModel, "viewModel");
			this.oi18nModel = this.getView().getModel("i18n");
			// this._loadCameraFragment();

		},

		onBeforeShow: async function (oEvent) {

			this.initialize();
			await this.showEntryForm();

		},

		initialize: async function () {
			this.oBundle = this.getView().getModel("i18n").getResourceBundle();
			this.setPageId('servicetest');
			this.isToastMsg = true;
			this.updateServiceTestModel();
			// Change Lane 
			// const oPermitResultPath = jQuery.sap.getModulePath(
			// 	'adnoc.vi.vehicleinspection',
			// 	'/modone/model/PermitResultSaveModel.json'

			// );
			// const oPermitResultModel = new JSONModel(oPermitResultPath);
			// this.getView().setModel(new JSONModel(oPermitResultModel), "PermitResultSaveModel");

			let oStoredData = localStorage.getItem("PermitResultSaveData");
			let oPermitResultModel;

			if (oStoredData) {
				oPermitResultModel = new JSONModel(JSON.parse(oStoredData));
			} else {
				const oPermitResultPath = jQuery.sap.getModulePath(
					'adnoc.vi.vehicleinspection',
					'/modone/model/PermitResultSaveModel.json'
				);
				oPermitResultModel = new JSONModel(oPermitResultPath);
			}

			this.getView().setModel(oPermitResultModel, "PermitResultSaveModel");

			const oTrafficAttachResultPath = jQuery.sap.getModulePath(
				'adnoc.vi.vehicleinspection',
				'/modone/model/TrafficAttachmentModel.json'

			);
			const oTrafficAttachModel = new JSONModel(oTrafficAttachResultPath);
			this.getView().setModel(new JSONModel(oTrafficAttachModel), "TrafficAttachFileModel");

			const oESMAResultPath = jQuery.sap.getModulePath(
				'adnoc.vi.vehicleinspection',
				'/modone/model/ESMATestModel.json'

			);
			const oESMAResultModel = new JSONModel(oESMAResultPath);
			this.getView().setModel(new JSONModel(oESMAResultModel), "ESMAListModel");

			const oFilePath = jQuery.sap.getModulePath(
				'adnoc.vi.vehicleinspection',
				'/modone/model/FileUploadModel.json'
			);
			const oFileModel = new JSONModel(oFilePath);
			this.getView().setModel(oFileModel, 'FileUploadedModel');

			const oFileViewPath = jQuery.sap.getModulePath(
				'adnoc.vi.vehicleinspection',
				'/modone/model/FileViewModel.json'
			);
			const oFileViewModel = new JSONModel(oFileViewPath);
			this.getView().setModel(oFileViewModel, 'FileViewModel');

			const oAttachPath = jQuery.sap.getModulePath(
				'adnoc.vi.vehicleinspection',
				'/modone/model/AttachmentModel.json'
			);
			const oAttachModel = new JSONModel(oAttachPath);
			this.getView().setModel(oAttachModel, 'FileAttachmentModel');

			this._aBase64FilesPermit = [];
			
			this.onLoadSelectFirstRow("First");
			let oView = this.getView(),
			oModel = new JSONModel();
			oView.setModel(oModel);
			this.setModelForColor(this.modelCellColor);
			this.updateServiceTestModel();
			
		},

	

		/**function to Exit from screen.
		* @memberof adnoc.vi.vehicleinspection.modone.controller.ServiceTest
		* @version 1.0.0
		* @since 01.01.2025
		* @author MA
		* @fires 
		*/
		onExit: function () {
			var oRouter = UIComponent.getRouterFor(this);
			oRouter.navTo("PendingRequest", false);

		},

		//#region Service Test 

		/**Handles row selection to display the test button and fetch corresponding data..
		* @memberof adnoc.vi.vehicleinspection.modone.controller.ServiceTest
		* @version 1.0.0
		* @since 01.01.2025
		* @author MA
		* @fires 
		*/
		onBtnPressVisibleButton: async function (oEvent) {

			let buttons = this.byId('Print_id'); // change name 
			let sComprehensiveTest = this.oBundle.getText("bTextComprehensiveTest");
			let sTrafficTest = this.oBundle.getText("bTextTrafficTest");
			let sESMATest = this.oBundle.getText("bTextESMATest");
			let sVisual = this.oBundle.getText("bTextVisual");
			let sChangeVehicleInfo = this.oBundle.getText("bTextChangeVehicleInfo");
			let sMaha = this.oBundle.getText("bTextMaha");
			let sPermit = this.oBundle.getText("bTextPermit");

			let oItem = oEvent.getSource();
			let oBindingContext = oItem.getBindingContext("lUpdateModelServiceTestModel");
			let oServiceTestList = this.byId("Listid");
			let oItemData = oBindingContext.getObject();
			this.charStatusData = oItemData;
			this.mahaData = oItemData;
			this.oSelectedDataRow = oItemData;

			let oVehicleModel = new JSONModel(oItemData.VehicleDetails);
			this.getView().setModel(oVehicleModel, 'VehicleDetailModel');
			let oModelForChange = this.getView().getModel('SericeTestModel');
			oModelForChange.setProperty("/VehicleDetails", oItemData.VehicleDetails)
			// oModelForChange.refresh(true)
			this.getView().setModel(oModelForChange, "SericeTestModel")

			/*Set Material Name for Visual Test Screen to show Selected data on header*/
			this.getView().getModel("VIRGlobalModel").setProperty('/CurrentInspection', oItemData.materialName);
			this.getView().getModel("VIRGlobalModel").setProperty('/CurrentPlateNo', oVehicleModel.getData().plateNumber);

			/** Change Color on the click */

			// console.log('ForVehicle',);
			//This comment is for changing the color when a row is clicked.
			// oList.getItems().forEach(function (item) {
			// 	let oHBoxInItem = item.getContent()[0]; 
			// 	let oHBoxDom = oHBoxInItem.getDomRef();
			// 	if (oHBoxDom) {
			// 		oHBoxDom.style.backgroundColor = "";
			// 		oHBoxDom.style.border = ""; // Reset border
			// 	}
			// });
			// let oHBox = oItem.getContent()[0]; 
			// let oHBoxDom = oHBox.getDomRef();
			// if (oHBoxDom) {
			// 	console.log(oHBoxDom.style.backgroundColor);
			// 	if(oHBoxDom.style.backgroundColor == "rgba(137, 159, 231, 0.35)"){

			// 		oHBoxDom.style.backgroundColor = "";
			// 	    oHBoxDom.style.border = "";
			// 	} else {
			// 		oHBoxDom.style.backgroundColor = "rgba(137, 159, 231, 0.35)";
			// 	    oHBoxDom.style.border = "2px solid #002e6d";
			// 	}
			// }
			this.onLoadSelectFirstRow(oItem);
			// oServiceTestList.getItems().forEach(function (item) {
			// 	let otemDomRef = item.getDomRef();
			// 	if (otemDomRef) {
			// 		otemDomRef.style.backgroundColor = "";
			// 		otemDomRef.style.border = "";
			// 	}
			// });

			// let oItemDomRef = oItem.getDomRef();
			// if (oItemDomRef) {
			// 	oItemDomRef.style.backgroundColor = "rgba(0,0,0,0.3)";
			// 	oItemDomRef.style.border = "2px solid #002e6d";
			// 	oItemDomRef.style.width = "99%";
			// }
			//create variable for visible buttion
			let aButtonsId = [
				{ id: sComprehensiveTest, ServiceTest: oItemData.VI_COMPREHENSIVE_TEST, Stutus: oItemData.VI_COMPREHENSIVE_TEST_Status },
				{ id: sTrafficTest, ServiceTest: oItemData.VI_TRAFFIC_TEST, Stutus: oItemData.VI_TRAFFIC_TEST_Status },
				{ id: sESMATest, ServiceTest: oItemData.VI_ESMA_TEST, Stutus: oItemData.VI_ESMA_TEST_Status },
				{ id: sVisual, ServiceTest: oItemData.VI_VISUAL_TEST, Stutus: oItemData.VI_VISUAL_TEST_Status },
				{ id: sChangeVehicleInfo, ServiceTest: oItemData.VI_CHANGE_VEHICLE_INFO, Stutus: oItemData.VI_CHANGE_VEHICLE_INFO_Status },
				{ id: sMaha, ServiceTest: oItemData.VI_MAHA_TEST, Stutus: oItemData.VI_MAHA_TEST_Status },
				{ id: sPermit, ServiceTest: oItemData.VI_PERMIT_TEST, Stutus: oItemData.VI_PERMIT_TEST_Status },
			]
			// console.log("=============>", aButtonsId);
			aButtonsId.forEach(item => {
				let oButtons = this.byId(item.id);
				if (item.ServiceTest != undefined) {
					if (item.ServiceTest == oItemData.VI_COMPREHENSIVE_TEST && item.Stutus == Constant.STATUS.OPEN || Constant.STATUS.INPROGRESS) {
						oButtons.setVisible(true);
					} else if (item.ServiceTest == oItemData.VI_TRAFFIC_TEST && item.Stutus == Constant.STATUS.OPEN || Constant.STATUS.INPROGRESS) {
						oButtons.setVisible(true);
					} else if (item.ServiceTest == oItemData.VI_ESMA_TEST && item.Stutus == Constant.STATUS.OPEN || Constant.STATUS.INPROGRESS) {
						oButtons.setVisible(true);
					} else if (item.ServiceTest == oItemData.VI_VISUAL_TEST && item.Stutus == Constant.STATUS.OPEN || Constant.STATUS.INPROGRESS) {
						oButtons.setVisible(true);
					} else if (item.ServiceTest == oItemData.VI_CHANGE_VEHICLE_INFO && item.Stutus == Constant.STATUS.OPEN || Constant.STATUS.INPROGRESS) {
						oButtons.setVisible(true);
					} else if (item.ServiceTest == oItemData.VI_MAHA_TEST && item.Stutus == Constant.STATUS.OPEN || Constant.STATUS.INPROGRESS) {
						oButtons.setVisible(true);
					} else if (item.ServiceTest == oItemData.VI_PERMIT_TEST && item.Stutus == Constant.STATUS.OPEN || Constant.STATUS.INPROGRESS) {
						oButtons.setVisible(true);
					}
				} else {
					oButtons.setVisible(false);
				}
				if (this.charStatusData.materialType == 'ZVCM') {
					oButtons.setVisible(false);
				}

			});

			await this.createNewModelUsingAPI(
				'GET',
				`odata/v2/vehicleinspection/VehicleOrderInspectionLines('${this.charStatusData.vehicleOrderInspectionLines}')?$expand=vehOrdInspLinesTestChars($expand=testResultsPermits)`,
				'',
				'OverAllStatusGetModel'
			);


			let aFinalRowStatus = this.getView().getModel('OverAllStatusGetModel').getData();
			this.charStatusData.attachmentGuId_attachmentGuId = aFinalRowStatus.d.attachmentGuId_attachmentGuId;
			if (aFinalRowStatus.d.overallTestStatus != null) {
				console.log("oItemData", aFinalRowStatus.overallTestStatus);
				buttons.setVisible(true);
			} else {
				buttons.setVisible(false);
			}
		},

		/**function to Over all Status for sales order.
		* @memberof adnoc.vi.vehicleinspection.modone.controller.ServiceTest
		* @version 1.0.0
		* @since 01.01.2025
		* @author MA
		* @fires 
		*/
		onloadOverallStatus: async function () {
			try {

				let UpdatedDataModel = this.getView().getModel('UpdatedDataModel');
				let oCharStatusList = this.charStatusData;
				if (!oCharStatusList) {
					return
				}

				let UpdatedData = this.getView().getModel('lUpdateModelServiceTestModel').getData();
				UpdatedDataModel.oData.d.VehOrdInspDetails.results.filter(Item => {
					if (Item.vehicleOrderInspectionLines === oCharStatusList.vehicleOrderInspectionLines) {
						UpdatedData = Item.vehOrdInspLines;
					}
				})
				// UpdatedData = UpdatedDataModel.d.VehOrdInspDetails.results[0].vehOrdInspLines;
				let lMainService = [{ applicableTestName: Constant.TESTTYPE.ES_OUT },{ applicableTestName: Constant.TESTTYPE.ES_IN },{ applicableTestName: Constant.TESTTYPE.VISUAL }, { applicableTestName: Constant.TESTTYPE.MAHA }, { applicableTestName: Constant.TESTTYPE.PERMIT }, { applicableTestName: Constant.TESTTYPE.ESMA }, { applicableTestName: Constant.TESTTYPE.TRAFFIC }, { applicableTestName: Constant.TESTTYPE.COMPREHENSIVE }];
				let lfilterData = await UpdatedData.results.filter(item => item.vehicleOrderInspectionLines === oCharStatusList.vehicleOrderInspectionLines);
				let filteredData = lfilterData[0].vehOrdInspLinesTestChars.results.filter(outerItem =>
					lMainService.some(filterItem =>
						outerItem.applicableTestName === filterItem.applicableTestName
					));

				// filteredData.forEach(item => {
				// 	if (item.testStatus === "OPEN" && item.applicableTestName === Constant.TESTTYPE.VISUAL) {
				// 		item.testStatus = 'PASS'
				// 	} else if (item.testStatus === "OPEN" && item.applicableTestName === Constant.TESTTYPE.MAHA) {
				// 		item.testStatus = 'PASS'
				// 	}
				// })
				let OverAllStatus = [];

				filteredData.filter(Item => {
					const { testStatus, applicableTestName } = Item;
					const isFailOrComplete = testStatus === Constant.STATUS.FAIL || testStatus === Constant.STATUS.COMPLETE;
					const isPassOrFail = testStatus === Constant.STATUS.PASS || testStatus === Constant.STATUS.FAIL;

					if (
						(isFailOrComplete && applicableTestName === Constant.TESTTYPE.COMPREHENSIVE) ||
						(isPassOrFail && applicableTestName === Constant.TESTTYPE.ESMA) ||
						(isPassOrFail && applicableTestName === Constant.TESTTYPE.TRAFFIC) ||
						(isFailOrComplete && applicableTestName === Constant.TESTTYPE.PERMIT) ||
						(isPassOrFail && applicableTestName === Constant.TESTTYPE.MAHA) ||
						(isPassOrFail && applicableTestName === Constant.TESTTYPE.VISUAL)||
						(isPassOrFail && applicableTestName === Constant.TESTTYPE.ES_OUT)||
						(isFailOrComplete && applicableTestName === Constant.TESTTYPE.ES_IN)
					) {
						OverAllStatus.push({ applicableTestName, Status: testStatus });
					}

				});
				// console.log("this is filter data", JSON.stringify(OverAllStatus));

				if (OverAllStatus.length > 0) {
					let buttons = this.byId('Print_id');
					// filteredData.filter(item => {
					// 	if (item.applicableTestName === Constant.TESTTYPE.TRAFFIC) {
					// 		buttons.setVisible(true);
					// 	} else if (item.applicableTestName === Constant.TESTTYPE.ESMA) {
					// 		buttons.setVisible(true);
					// 	} else if (item.applicableTestName === Constant.TESTTYPE.PERMIT) {
					// 		buttons.setVisible(true);
					// 	} else if (item.applicableTestName === Constant.TESTTYPE.COMPREHENSIVE) {
					// 		buttons.setVisible(true);
					// 	} else if (item.applicableTestName === Constant.TESTTYPE.VISUAL) {
					// 		buttons.setVisible(true);
					// 	}
					// });

					let lPaylaod = { Payload: OverAllStatus };
					console.log("payload", lPaylaod);
					await this.createNewModelUsingAPI('POST', `odata/v2/vehicleinspection/overAllStatus`, lPaylaod, 'OverallStatusModel');
					let oModel = this.getView().getModel('OverallStatusModel');
					let lOverLoadData = oModel.getData();
					console.log('lOverLoadData', lOverLoadData);
					console.log("filteredData", filteredData);
					console.log("lfilterData", lfilterData[0].vehicleOrderInspectionLines);
					if (lOverLoadData.d) {
						let data = {
							overallTestStatus: lOverLoadData.d.results[0].overallFinalTestStatus
						}
						await this.createNewModelUsingAPI('PATCH', `odata/v2/vehicleinspection/VehicleOrderInspectionLines(${lfilterData[0].vehicleOrderInspectionLines})`, data, 'OverallStatusModel');
						let oModel = this.getView().getModel('OverallStatusModel');

						buttons.setVisible(true);
					}

				}


			} catch (error) {
				throw console.log("Error: in Over all status..." + error.message);
			}
		},

		/**function to get updated data..
		* @memberof adnoc.vi.vehicleinspection.modone.controller.ServiceTest
		* @version 1.0.0
		* @since 01.01.2025
		* @author MA
		* @fires modifyServiceTestModel,onloadOverallStatus
		*/
		updateServiceTestModel: async function () {
			let oFetchUpdatedData = this.getOwnerComponent().getModel("SericeTestModel").getData();
			// let oFetchUpdatedData = oModel.getData();

			let oServiceTestModel = new JSONModel(oFetchUpdatedData);
			const sServiceTestGuid = oServiceTestModel.oData.vehicleOrderInspectionUUID;
			const sVehicleGUID = oServiceTestModel.oData.VehicleDetails_vehicleMastersUUID;
			let aUpdatedVehicleData = [];
			if (sVehicleGUID) {

				await this.createNewModelUsingAPI(
					"GET",
					`odata/v2/vehicleinspection/VehicleMasters(${sVehicleGUID})`,
					"",
					"oVehcileDataModel"
				);

				aUpdatedVehicleData = this.getView().getModel("oVehcileDataModel").getData();
			} else {

				console.log("Vehicle Guid not found.");

			}

			if (sServiceTestGuid) {
				await this.createNewModelUsingAPI(
					"GET",
					`odata/v2/vehicleinspection/VehicleOrderInspections(${sServiceTestGuid})?$expand=VehOrdInspDetails($filter=laneCode eq '${oFetchUpdatedData.laneCode}' and plantCode eq '${oFetchUpdatedData.plantCode}' and status ne 'onHold' $expand=VehicleDetails,vehOrdInspLines($expand=vehOrdInspLinesTestChars($expand=testResultsVisuals($expand=testResultsVisualDetail))))`,
					"",
					"UpdatedDataModel"
				);

			} else {

				console.log("Service Guid not found.");

			}
			const oUpdatedDataModel = this.getView().getModel("UpdatedDataModel").getData();
			// this.getView().setModel(oUpdatedDataModel, "UpdatedDataModel");


			let aTotalLine = [];
			oUpdatedDataModel.d.VehOrdInspDetails.results.forEach(Item => {
				Item.vehOrdInspLines.results.forEach(vehOrdInspLine => {
					//Add VehicleDetails to each line item
					let lineItem = Object.assign({}, vehOrdInspLine);
					lineItem.VehicleDetails = Item.VehicleDetails;
					lineItem.VehicleDetails.serviceRequestNo = oUpdatedDataModel.d.serviceRequestNo;
					lineItem.VehicleDetails.orderTotal = oUpdatedDataModel.d.orderTotal;
					lineItem.VehicleDetails.totalVAT = oUpdatedDataModel.d.totalVAT;
					lineItem.VehicleDetails.currencyCode = oUpdatedDataModel.d.currencyCode;
					aTotalLine.push(lineItem);
				});
			});
			// Final structure
			let finalData = {
				vehOrdInspLines: {
					results: aTotalLine
				}
			};

			this.modifyServiceTestModel(finalData, aUpdatedVehicleData);
			this.onloadOverallStatus();
			this.getView().getModel("VIRGlobalModel").setProperty('/UpdatedDataModel', oUpdatedDataModel);
		},

		/**Function to set required value in the model..
		* @memberof adnoc.vi.vehicleinspection.modone.controller.ServiceTest
		* @version 1.0.0
		* @since 01.01.2025
		* @author MA
		* @fires 
		*/
		modifyServiceTestModel: async function (oUpdatedData, oVehicleDetails) {
			let sNAValue = this.oBundle.getText("NotExist");
			let sForZero = this.oBundle.getText("ForZero");
			let oModel = this.getOwnerComponent().getModel("SericeTestModel");
			let aDataModify = oModel.getData();
			// console.log("oModel", aDataModify);
			let iOrdering = 1;

			let oServiceTestModel = new JSONModel(oUpdatedData);
			// const registrationExpiryDate = this.onloadDateFormate(aDataModify.VehicleDetails.registrationExpiryDate);
			oServiceTestModel.oData.vehOrdInspLines.results.forEach((Item, index) => {
				const registrationExpiryDate = Formatter.convertV2ODataDateFormart_DD_MM_YYYY(Item.VehicleDetails.registrationExpiryDate);
				Item.VehicleDetails.registrationExpiryDate = registrationExpiryDate;
				Item.VehicleDetails.mileage = Item.VehicleDetails.mileage ? Item.VehicleDetails.mileage : sNAValue;
				Item.VehicleDetails.plateTypeEnglish = Item.VehicleDetails.plateTypeEnglish ? Item.VehicleDetails.plateTypeEnglish : sNAValue;
				Item.VehicleDetails.bodyColorEnglish = Item.VehicleDetails.bodyColorEnglish ? Item.VehicleDetails.bodyColorEnglish : sNAValue;
				Item.VehicleDetails.gearTypeEnglish = Item.VehicleDetails.gearTypeEnglish ? Item.VehicleDetails.gearTypeEnglish : sNAValue;
				Item.VehicleDetails.fuelTypeEnglish = Item.VehicleDetails.fuelTypeEnglish ? Item.VehicleDetails.fuelTypeEnglish : sNAValue;
				Item.VehicleDetails.manufacturingYear = Item.VehicleDetails.manufacturingYear ? Item.VehicleDetails.manufacturingYear : sNAValue;
				Item.VehicleDetails.steeringSideEnglish = Item.VehicleDetails.steeringSideEnglish ? Item.VehicleDetails.steeringSideEnglish : sNAValue;
				Item.VehicleDetails.plateNumber = Item.VehicleDetails.plateNumber;
				Item.VehicleDetails.serviceRequestNo = Item.VehicleDetails.serviceRequestNo ? Item.VehicleDetails.serviceRequestNo : sNAValue;
				Item.VehicleDetails.orderTotal = Item.VehicleDetails.orderTotal ? Item.VehicleDetails.orderTotal : sForZero;
				Item.VehicleDetails.totalVAT = Item.VehicleDetails.totalVAT ? Item.VehicleDetails.totalVAT : sForZero;
				Item.VehicleDetails.currencyCode = Item.VehicleDetails.currencyCode ? Item.VehicleDetails.currencyCode : sNAValue;

			})

			this.getView().setModel(oServiceTestModel, 'lServiceTestModel');

			oServiceTestModel.oData.vehOrdInspLines.results.forEach((inspLine, i) => {
				let lMaterialName = inspLine.materialName;
				let materialType = inspLine.materialType;
				let sAddForMaterialName = { property: "materialName" };


				inspLine.vehOrdInspLinesTestChars.results.forEach((testChar, j) => {
					let sApplicableTestName = testChar.applicableTestName;
					let lTestStatus = testChar.testStatus;
					const modelPath = `/vehOrdInspLines/results/${i}`;
					const testCharPath = `${modelPath}/vehOrdInspLinesTestChars/results/${j}`;

					this.getView().getModel("lServiceTestModel").setProperty(`${modelPath}/${sApplicableTestName}`, sApplicableTestName);
					this.getView().getModel("lServiceTestModel").setProperty(`${modelPath}/${sApplicableTestName}_Status`, lTestStatus);
					this.getView().getModel("lServiceTestModel").setProperty(`${testCharPath}/materialName`, lMaterialName);
					this.getView().getModel("lServiceTestModel").setProperty(`${testCharPath}/property`, sApplicableTestName);
					this.getView().getModel("lServiceTestModel").setProperty(`${testCharPath}/selected`, false);

					// if (sApplicableTestName === Constant.TESTTYPE.VISUAL) {
					// 	this.getView().getModel("lServiceTestModel").setProperty(`${modelPath}/${sApplicableTestName}_Status`, Constant.STATUS.PASS);
					// }

					if (sApplicableTestName === Constant.TESTTYPE.COMPREHENSIVE) {
						this.comprehensiveComment = testChar.testComments;
					}

					if (sApplicableTestName === Constant.TESTTYPE.TRAFFIC) {
						sTrafficComment = testChar.testComments;
					}

					const oTestNameMap = {
						VI_CHANGE_VEHICLE_INFO: Constant.TestNameMap.VI_CHANGE_VEHICLE_INFO,
						VI_MAHA_TEST: Constant.TestNameMap.VI_MAHA_TEST,
						VI_ESMA_TEST: Constant.TestNameMap.VI_ESMA_TEST,
						VI_TRAFFIC_TEST: Constant.TestNameMap.VI_TRAFFIC_TEST,
						VI_VISUAL_TEST: Constant.TestNameMap.VI_VISUAL_TEST,
						VI_PERMIT_TEST: Constant.TestNameMap.VI_PERMIT_TEST,
						VI_COMPREHENSIVE_TEST: Constant.TestNameMap.VI_COMPREHENSIVE_TEST,
						ES_OUT: Constant.TestNameMap.ES_OUT,
						ES_IN: Constant.TestNameMap.ES_IN
					};

					Object.entries(oTestNameMap).forEach(([key, label]) => {
						if (inspLine[key] === sApplicableTestName) {
							this.getView().getModel("lServiceTestModel").setProperty(`${modelPath}/${key}`, label);
						}
					});
				});

				// inspLine.vehOrdInspLinesTestChars.results.splice(0, 0, sApplicableTestName);
			});
			let aFilterData = { results: oServiceTestModel.oData.vehOrdInspLines.results.filter(Item => { return Item.materialType === "ZVTS" || Item.materialType == 'ZVCM' }) }

			/*Set All Material Lines Data to move visual Inspection Form*/
			this.getView().getModel("VIRGlobalModel").setProperty('/surajService', aFilterData.results);
			// Ordering Accessories 
			aFilterData.results.filter(Item => {
				{
					if (Item.materialType == 'ZVCM') { Item.OrderingNo = iOrdering++ }
					else { Item.OrderingNo = 0 }
				}
			});


			// console.log("this.oSelectedDataRow Before", this.oSelectedDataRow);
			aFilterData.results.sort((a, b) => a.OrderingNo - b.OrderingNo);
			if (!this.oSelectedDataRow) {
				// console.log("aFilterData", aFilterData.results[0].VehicleDetails.serviceRequestNo);
				let oVehicleModel = new JSONModel(aFilterData.results[0].VehicleDetails);
				this.getView().setModel(oVehicleModel, 'VehicleDetailModel');
			} else {
				aFilterData.results.filter(Item => {
					if (Item.VehicleDetails.vehicleMastersUUID === this.oSelectedDataRow.VehicleDetails.vehicleMastersUUID) {
						let oVehicleModel = new JSONModel(Item.VehicleDetails);
						this.getView().setModel(oVehicleModel, 'VehicleDetailModel');
					}
				})
			}

			// console.log("this.oSelectedDataRow After", this.oSelectedDataRow);
			let aUpdateModelServiceTestModel = new JSONModel(aFilterData);
			this.getView().setModel(aUpdateModelServiceTestModel, 'lUpdateModelServiceTestModel');
			this.onloadCertificateStatusUpdate(aUpdateModelServiceTestModel);
			if(this.charStatusData){
				let oData = aUpdateModelServiceTestModel.oData.results.find(item => {
					return item.vehicleOrderInspectionLines === this.charStatusData.vehicleOrderInspectionLines;
				});
				this.charStatusData = oData;
			}
		},


		/**Function to use for Update certificate status
		* @memberof adnoc.vi.vehicleinspection.modone.controller.ServiceTest
		* @version 1.0.0
		* @since 01.01.2025
		* @author MA
		* @fires 
		*/
		onloadCertificateStatusUpdate: async function (odata) {
			try {
				let oSelectedRowData = this.charStatusData;
				let sES_IN = '';
				let sES_OUT = '';
				let sVISUAL = '';
				let sFinalStatus = ''
				if (oSelectedRowData) {
					let VehicleCer = oSelectedRowData.vehOrdInspLinesTestChars.results.find(item => item.applicableTestName === Constant.TESTTYPE.VEHICLE_CERTIFICATE);

					if (VehicleCer) {
						let oData = odata.oData.results.find(item => {
							return item.vehicleOrderInspectionLines === oSelectedRowData.vehicleOrderInspectionLines;
						});

						let bFlagForCertificateExist = oData.vehOrdInspLinesTestChars.results.some(item => item.applicableTestName === Constant.TESTTYPE.VEHICLE_CERTIFICATE);
						if (bFlagForCertificateExist) {

							let aFilterData = oData.vehOrdInspLinesTestChars.results.filter(item => {

								return item.applicableTestName === Constant.TESTTYPE.ES_IN ||
									item.applicableTestName === Constant.TESTTYPE.ES_OUT ||
									item.applicableTestName === Constant.TESTTYPE.VISUAL;

							});
							aFilterData.forEach(Item => {
								const { applicableTestName, testStatus } = Item;
								if (applicableTestName == Constant.TESTTYPE.ES_IN) {
									if (testStatus === Constant.STATUS.COMPLETE) {
										sES_IN = Constant.STATUS.COMPLETE
									} else if (testStatus === Constant.STATUS.FAIL) {
										sES_IN = Constant.STATUS.FAIL
									} else {
										sES_IN = Constant.STATUS.NONE
									}

								}

								if (applicableTestName === Constant.TESTTYPE.ES_OUT) {
									if (testStatus === Constant.STATUS.PASS) {
										sES_OUT = Constant.STATUS.PASS;
									} else if (testStatus === Constant.STATUS.FAIL) {
										sES_OUT = Constant.STATUS.FAIL;
									} else {
										sES_OUT = Constant.STATUS.NONE;
									}
								}
								if (applicableTestName === Constant.TESTTYPE.VISUAL) {
									if (testStatus === Constant.STATUS.PASS) {
										sVISUAL = Constant.STATUS.PASS;
									} else if (testStatus === Constant.STATUS.FAIL) {
										sVISUAL = Constant.STATUS.FAIL;
									} else {
										sVISUAL = Constant.STATUS.NONE;
									}
								}
							});

							if (sES_IN && sES_OUT && sVISUAL != Constant.STATUS.NONE) {
								if (sES_IN == Constant.STATUS.COMPLETE && sES_OUT == Constant.STATUS.PASS && sVISUAL === Constant.STATUS.PASS) {
									sFinalStatus = Constant.STATUS.COMPLETE;
								} else {
									sFinalStatus = Constant.STATUS.FAIL;
								}
								let oPaylaod = {
									testStatus: sFinalStatus,
									testComments: "",

								}
								await this.saveEntryForm(
									"PATCH",
									`odata/v2/vehicleinspection/VehicleOrderInspectionLinesTestChar(${VehicleCer.VehicleOrderInspectionLinesTestCharUUID})`,
									oPaylaod
								);
								
							}
						}
					}

				}

			} catch
			(error) {
				console.log('error: in the onload Certificate Status Update' + error.message);
			}
		},

		/**Function use for Selected first row.
		* @memberof adnoc.vi.vehicleinspection.modone.controller.ServiceTest
		* @version 1.0.0
		* @since 01.01.2025
		* @author MA
		* @fires 
		*/
		onLoadSelectFirstRow: function (SeletedRow) {
			try {
				let oServiceTestList = this.byId("Listid");
				if (SeletedRow === 'First') {
					oServiceTestList.attachEventOnce("updateFinished", function () {
						let aItems = oServiceTestList.getItems();
						if (aItems.length > 0) {
							var oFirstItem = aItems[0];
							aItems.forEach(function (item) {
								var oItemDomRef = item.getDomRef();
								if (oItemDomRef) {
									oItemDomRef.style.backgroundColor = "";
									oItemDomRef.style.border = "";
									oItemDomRef.style.width = "";
								}
							});

							let oFirstItemDomRef = oFirstItem.getDomRef();
							if (oFirstItemDomRef) {
								oFirstItemDomRef.style.backgroundColor = "rgba(0,0,0,0.3)";
								oFirstItemDomRef.style.border = "2px solid #002e6d";
								oFirstItemDomRef.style.width = "99%";
							}
						}
					});
				} else {
					oServiceTestList.getItems().forEach(function (item) {
						let otemDomRef = item.getDomRef();
						if (otemDomRef) {
							otemDomRef.style.backgroundColor = "";
							otemDomRef.style.border = "";
						}
					});

					let oItemDomRef = SeletedRow.getDomRef();
					if (oItemDomRef) {
						oItemDomRef.style.backgroundColor = "rgba(0,0,0,0.3)";
						oItemDomRef.style.border = "2px solid #002e6d";
						oItemDomRef.style.width = "99%";
					}
				}

			} catch (error) {
				throw 'Error: on selecting row on load (onLoadSelectFirstRow)' + error.message;
			}
		},

		//#endregion

		//#region Comprehensive Header Color
		/**Create model for color set.
		* @memberof adnoc.vi.vehicleinspection.modone.controller.ServiceTest
		* @version 1.0.0
		* @since 01.01.2025
		* @author MA
		* @fires 
		*/
		modelCellColor: {
			colorSet: CellColorSet.ColorSet6
		},
		/**Function to styling header compehensive test.
		* @memberof adnoc.vi.vehicleinspection.modone.controller.ServiceTest
		* @version 1.0.0
		* @since 01.01.2025
		* @author MA
		* @fires 
		*/
		setModelForColor: function (oData) {
			let oModel = this.getView().getModel();
			oModel.setData(oData);
		},
		//#endregion

		//#region ChangeVehicleRegion

		// For Change Info Start - Alka
		/**
		 * function call for open fragment
		 * @memberof: adnoc.vi.vehicleinspection.modone.controller.CreateCustomer
		 * @version: 1.0.0
		 * @since:  20.05.2025
		 * @fires: onPressChangeInfo,updateServiceTestModel,
		 * @author: Alka Srivastava
		 */
		onPressChangeInfo: async function () {
			await this.updateServiceTestModel();
			if (!this.ChangeinfoFrag) {
				this.ChangeinfoFrag = sap.ui.xmlfragment(this.getView().getId(), "adnoc.vi.vehicleinspection.modone.fragment.view.ChangeInfo", this);
				this.getView().addDependent(this.ChangeinfoFrag);
			}

			let oModel = this.getView().getModel("SericeTestModel");
			this.setlabelvalue();
			let oMainModel = this.getView().getModel("SericeTestModel");
			let oNewVehicleData = JSON.parse(JSON.stringify(oMainModel.getProperty("/NewVehicleDetails")));
			oMainModel.setProperty('/NewVehicleDetails', oNewVehicleData);
			let charStatusList = this.charStatusData;
			const oFilteredResults = charStatusList.vehOrdInspLinesTestChars.results.filter(item => item.applicableTestName === "VI_CHANGE_VEHICLE_INFO");
			const aVehicleOrderGuid = oFilteredResults.map(item => ({
				VehicleOrderInspectionLinesTestCharUUID: item.VehicleOrderInspectionLinesTestCharUUID
			}));
			const sVehicleOrderGuid = aVehicleOrderGuid[0].VehicleOrderInspectionLinesTestCharUUID
			await this.saveEntryForm("GET", "odata/v2/vehicleinspection/VehicleOrderInspectionLinesTestChar(" + sVehicleOrderGuid + ")?$expand=vehicleOrderInspectionChangeVehicleLogs", null);
			let oResponse = this.getApiResponseObject();
			oModel.setProperty("/vehicleOrderInspectionChangeVehicleLogs", oResponse.vehicleOrderInspectionChangeVehicleLogs);
			const aChangeArray = {
				ChangeinfoStartdate: oResponse.object.d.testInspectionStartDate,
				ChangeinfoEnddate: oResponse.object.d.testInspectionEndDate,
				testComments: oResponse.object.d.testComments
			}
			oMainModel.setProperty("/StartDateEndDate", aChangeArray);
			await this._reloadChangeVehicleInfoScreen(oResponse.object.d.vehicleOrderInspectionChangeVehicleLogs.results);
			await this.ChangeinfoFrag.open();
			await this.cflSuggestionModel();
		},

		/**
		 * function call for Reload Chnage vehicle info  Screen
		 * @memberof:adnoc.vi.vehicleinspection.modone.controller.CreateCustomer
		 * @version: 1.0.0
		 * @since: 20.05.2025
		 * @fires: _reloadChangeVehicleInfoScreen
		 * @author: Alka Srivastava
		 */
		_reloadChangeVehicleInfoScreen: async function (vehicleData) {
			let oModel = this.getView().getModel("SericeTestModel");
			console.log(" Data Before updated in the model.", oModel);
			// Prepare new objects
			let oNewVehicleDetails = JSON.parse(JSON.stringify(oModel.getProperty("/NewVehicleDetails")));
			oCflFilterObject = `&$filter=manufacture_makeCode eq ${oNewVehicleDetails.manfacturerCode} and model_modelCode eq ${oNewVehicleDetails.modelCode} and vehicleKind_kindCode eq ${oNewVehicleDetails.kindCode}`
			let oVehicleLabels = oModel.getProperty("/VehicleLabels");
			const oArabicKey = {
				"bodyColorEnglish": "bodyColorArabic",
				"fuelTypeEnglish": "fuelTypeArabic",
				"gearTypeEnglish": "gearTypeArabic",
				"insuranceKindEnglish": "insuranceKindArabic",
				"kindEnglish": "kindArabic",
				"manfacturerEnglish": "manfacturerArabic",
				"modelEnglish": "modelArabic",
				"nationalityEnglish": "nationalityArabic",
				"plateColorEnglish": "plateColorArabic",
				"plateKindEnglish": "plateKindArabic",
				"plateSourceEnglish": "plateSourceArabic",
				"plateTypeEnglish": "plateTypeArabic",
				"steeringSideEnglish": "steeringSideArabic",
				"typeEnglish": "typeArabic",
				"weightDiscEnglish": "weightDiscArabic"
			};
			const oCodeKey = {
				"bodyColorEnglish": "bodyColorCode",
				"fuelTypeEnglish": "fuelTypeCode",
				"gearTypeEnglish": "gearTypeCode",
				"kindEnglish": "kindCode",
				"manfacturerEnglish": "manfacturerCode",
				"modelEnglish": "modelCode",
				"nationalityEnglish": "nationalityCode",
				"plateColorEnglish": "plateColorCode",
				"plateKindEnglish": "plateKindCode",
				"plateSourceEnglish": "plateSourceCode",
				"plateTypeEnglish": "plateTypeCode",
				"steeringSideEnglish": "steeringSideCode",
				"typeEnglish": "typeCode",
				"weightDiscEnglish": "weightDiscCode"
			};
			Object.keys(oVehicleLabels).forEach((key) => {
				vehicleData.forEach((item) => {
					if (item.newValueCode && oVehicleLabels[key] == item.fieldLabelEnglish) {
						const vValueType = typeof oNewVehicleDetails[key];
						if (vValueType === 'number') {
							oNewVehicleDetails[key] = parseFloat(item.newTextEnglish);
							oNewVehicleDetails[oCodeKey[key]] = parseFloat(item.newValueCode);
							oNewVehicleDetails[oArabicKey[key]] = parseFloat(item.newTextArabic);
						} else if (vValueType === 'boolean') {
							oNewVehicleDetails[key] = item.newTextEnglish === 'true' || item.newTextEnglish === true;
							oNewVehicleDetails[oCodeKey[key]] = item.newValueCode;
							oNewVehicleDetails[oArabicKey[key]] = item.newTextArabic;
						} else {
							oNewVehicleDetails[key] = item.newTextEnglish;
							oNewVehicleDetails[oCodeKey[key]] = item.newValueCode;
							oNewVehicleDetails[oArabicKey[key]] = item.newTextArabic;
						}
					}
				});
			});

			let charStatusList = this.charStatusData;
			let UpdatedData
			let oCharStatusList = this.charStatusData;
			let UpdatedDataModel = this.getView().getModel('lUpdateModelServiceTestModel').getData();
			UpdatedDataModel.results.filter(Item => {
				if (Item.vehicleOrderInspectionLines === oCharStatusList.vehicleOrderInspectionLines) {
					UpdatedData = Item;
				}
			})




			// const sFilteredResults = UpdatedData.vehOrdInspLinesTestChars.results.filter(item => item.applicableTestName === "VI_CHANGE_VEHICLE_INFO" || item.applicableTestName === "ES_OUT")[0].testStatus;
			const sFilteredResults = UpdatedData.vehOrdInspLinesTestChars.results
				.filter(item =>
					item.applicableTestName === "VI_CHANGE_VEHICLE_INFO" ||
					item.applicableTestName === "ES_OUT"
				)
				.map(item => item.testStatus);
			console.log("FinalData --------------------------", sFilteredResults)
			// let aEnableArray = ["INPROGRESS", "OPEN"];
			let aEnableArray = ["COMPLETED", "PASS", "FAILED"];
			// const bIsEditable = (aEnableArray.includes(sFilteredResults));
			// const bIsEditable = aEnableArray.some(item => !sFilteredResults.includes(item));
			const bIsEditable = !aEnableArray.some(item => sFilteredResults.includes(item));

			//console.log(" Data Before updated in the oNewVehicleDetails.", oNewVehicleDetails);
			oModel.setProperty("/NewVehicleDetails", oNewVehicleDetails);
			oModel.setProperty("/isEditable", bIsEditable);
			oModel.refresh(true); // Refresh UI
			//console.log(" Data successfully updated in the model.", oModel);
			//this.oi18nModel = this.getView().getModel("i18n");
		},

		/**
		 * Function Call for SetLabelValue 
		 * @memberof: adnoc.vi.vehicleinspection.modone.controller.CreateCustomer
		 * @version: 1.0.0
		 * @since:  20.05.2025
		 * @fires: setlabelvalue
		 * @author: Alka Srivastava
		 */
		setlabelvalue: function () {
			const oBundle = this.getView().getModel("i18n").getResourceBundle();
			const oVehicleData = {
				chasisNumber: oBundle.getText("vehInfo_chasisNumber"),
				engineNumber: oBundle.getText("vehInfo_engineNumber"),
				country: oBundle.getText("vehInfo_country"),
				manfacturerEnglish: oBundle.getText("vehInfo_manfacturerEnglish"),
				modelEnglish: oBundle.getText("vehInfo_modelEnglish"),
				plateTypeEnglish: oBundle.getText("vehInfo_plateTypeEng"),
				kindEnglish: oBundle.getText("vehInfo_kindEnglish"),
				typeEnglish: oBundle.getText("vehInfo_typeEnglish"),
				bodyColorEnglish: oBundle.getText("vehInfo_bodyColorEng"),
				gearTypeEnglish: oBundle.getText("vehInfo_gearTypeEng"),
				fuelTypeEnglish: oBundle.getText("vehInfo_fuelTypeEng"),
				steeringSideEnglish: oBundle.getText("vehInfo_steeringSideEng"),
				registrationYear: oBundle.getText("vehInfo_registrationYearDesc"),
				weightDiscEnglish: oBundle.getText("vehInfo_weightDescEng"),
				registrationExpiryDate: oBundle.getText("vehInfo_registrationYear"),
				manufacturingYear: oBundle.getText("vehInfo_manufacturingYear"),
				horsePower: oBundle.getText("vehInfo_horsePower"),
				numberOfAxel: oBundle.getText("vehInfo_numberOfAxel"),
				numberOfCylinders: oBundle.getText("vehInfo_numberOfCylinders"),
				numberOfWheels: oBundle.getText("vehInfo_numberOfWheels"),
				numberOfDoors: oBundle.getText("vehInfo_numberOfDoors"),
				numberOfPassengers: oBundle.getText("vehInfo_numberOfPassengers"),
				emptyWeight: oBundle.getText("vehInfo_emptyWeight"),
				fullWeight: oBundle.getText("vehInfo_fullWeight"),
				mileage: oBundle.getText("vehInfo_mileage"),
				cubicCapacity: oBundle.getText("vehInfo_cubicCapacity"),
				regCarRemarkEnglish: oBundle.getText("vehInfo_regCarRemarkEnglish"),
				lostPlateEnglish: oBundle.getText("vehInfo_lostPlateEnglish"),
				damagePlateEnglish: oBundle.getText("vehInfo_damagePlateEnglish"),
				mileageMtrEnglish: oBundle.getText("vehInfo_mileageMtrEnglish"),
				customerType: oBundle.getText("vehInfo_customerType"),
				isModifiedVehicle: oBundle.getText("vehInfo_isModifiedVehicle"),
				isHandicappedVehicle: oBundle.getText("vehInfo_isHandicappedVehicle"),
				isArmedVehicle: oBundle.getText("vehInfo_isArmedVehicle"),
				isAccidentVehicle: oBundle.getText("vehInfo_isAccidentVehicle"),
				isGCCVehicle: oBundle.getText("vehInfo_isGCCVehicle")
			};
			const oDropdown = {
				customerTypes: [
					{ key: "Individual", text: "Individual" },
					{ key: "Corporate", text: "Corporate" }
				]
			}
			let oSericeTestModel = this.getView().getModel("SericeTestModel");
			let oNewVehicleData = JSON.parse(JSON.stringify(oSericeTestModel.getProperty("/VehicleDetails")));
			oNewVehicleData.customerType = ""
			oSericeTestModel.setProperty("/VehicleLabels", oVehicleData);
			oSericeTestModel.setProperty("/NewVehicleDetails", oNewVehicleData);
			oSericeTestModel.setProperty("/VehicleDetailsDropdown", oDropdown);
			this.getView().setModel(oSericeTestModel, "SericeTestModel")
		},

		/**
		 * This Function Call API For Country Value Halper
		 * @memberof:adnoc.vi.vehicleinspection.modone.controller.CreateCustomer
		 * @version: 1.0.0
		 * @since:  20.05.2025
		 * @fires: createNewModelUsingAPI,onClosecflForCountry,getCflListViewDataSourceModelName,showCfl,setCflSearchProperty,setCflTitle,setCflDisplayColumns,setCflDataColumns,setCflValueAndDisplay
		 * @author: Alka Srivastava
		 */
		cflForCountry: async function () {

			await this.createNewModelUsingAPI(
				'GET',
				'odata/v2/vehicleinspection/CountryMasters',
				'',
				this.getCflListViewDataSourceModelName()
			);
			this.setCflTitle('Country List');
			this.setCflDisplayColumns(['Country Code', 'CountryName English', 'CountryName Arabic']);
			this.setCflDataColumns(['countryCode', 'countryNameEnglish', 'countryNameArabic']);
			this.setCflValueAndDisplay('/countryNameEnglish', 'countryNameEnglish', '', '');
			this.setCflSearchProperty('countryNameEnglish');
			this.showCfl('countryIdST', this.getCflListViewDataSourceModelName(), 'd/results', this.onClosecflForCountry.bind(this));

		},

		/**
		 * Function Call For On Close Cfl
		 * @memberof:adnoc.vi.vehicleinspection.modone.controller.CreateCustomer
		 * @version: 1.0.0
		 * @since:  20.05.2025
		 * @fires: onClosecflForCountry
		 * @author: Alka Srivastava
		 */
		onClosecflForCountry: function () {
			let oSelectedModel = this.getCflObject();
			let oMainModel = this.getView().getModel("SericeTestModel");
			console.log("testing data", oSelectedModel);
			let newVehicleData = JSON.parse(JSON.stringify(oMainModel.getProperty("/NewVehicleDetails")));
			newVehicleData.country = oSelectedModel.countryNameEnglish;
			newVehicleData.countryCode = oSelectedModel.countryCode;
			newVehicleData.countryCode = oSelectedModel.countryNameArabic;
			oMainModel.setProperty('/NewVehicleDetails', newVehicleData);
		},

		/**
		 * This Function Call API For Manufacturer Value Halper
		 * @memberof: adnoc.vi.vehicleinspection.modone.controller.CreateCustomer
		 * @version: 1.0.0
		 * @since: 20.05.2025
		 * @fires: createNewModelUsingAPI,onClosecflFormanufactur,getCflListViewDataSourceModelName,showCfl,setCflSearchProperty,setCflTitle,setCflDisplayColumns,setCflDataColumns,setCflValueAndDisplay
		 * @author: Alka Srivastava
		 */
		cflForManufacturer: async function () {
			await this.createNewModelUsingAPI(
				'GET',
				'odata/v2/vehicleinspection/VehicleLookupConfiguration?$expand=manufacture',
				'',
				this.getCflListViewDataSourceModelName()
			);
			this.setCflTitle('Manufacturer List');
			this.setCflDisplayColumns(['Manufacturer Code', 'ManufacturerName English', 'ManufacturerName Arabic']);
			this.setCflDataColumns(['manufacture_makeCode', "manufacture/manufacturerEnglish", "manufacture/manufacturerArabic"]);
			this.setCflValueAndDisplay('/manufacture/0/manufacturerEnglish', 'manufacturerEnglish', '', '');
			this.setCflSearchProperty('manufacture/manufacturerEnglish');
			this.showCfl('manufacturIdST', this.getCflListViewDataSourceModelName(), 'd/results', this.onClosecflFormanufactur.bind(this));
		},

		/**
		 * Function Call For On Close Cfl
		 * @memberof: adnoc.vi.vehicleinspection.modone.controller.CreateCustomer
		 * @version: 1.0.0
		 * @since:  20.05.2025
		 * @fires: onClosecflFormanufactur
		 * @author: Alka Srivastava
		 */
		onClosecflFormanufactur: function () {
			let oSelectedModel = this.getCflObject();
			let oMainModel = this.getView().getModel("SericeTestModel");
			let newVehicleData = JSON.parse(JSON.stringify(oMainModel.getProperty("/NewVehicleDetails")));
			newVehicleData.manfacturerEnglish = oSelectedModel.manufacture.manufacturerEnglish;
			newVehicleData.manfacturerArabic = oSelectedModel.manufacture.manufacturerArabic;
			newVehicleData.manfacturerCode = oSelectedModel.manufacture.makeCode;
			oMainModel.setProperty('/NewVehicleDetails', newVehicleData);
			oCflFilterObject = "&$filter=manufacture_makeCode eq " + oSelectedModel.manufacture_makeCode;
		},

		/**
		 * Function Call API For Model Value Halper
		 * @memberof:adnoc.vi.vehicleinspection.modone.controller.CreateCustomer
		 * @version: 1.0.0
		 * @since:  20.05.2025
		 * @fires: createNewModelUsingAPI,onClosecflForModel,getCflListViewDataSourceModelName,showCfl,setCflSearchProperty,setCflTitle,setCflDisplayColumns,setCflDataColumns,setCflValueAndDisplay
		 * @author: Alka Srivastava
		 */
		cflForModel: async function () {
			if (oCflFilterObject != "undefined" && oCflFilterObject != null && oCflFilterObject != "" && oCflFilterObject.includes("manufacture_makeCode")) {
				let indexToRemoveAfter = oCflFilterObject.indexOf(" and model_modelCode");
				if (indexToRemoveAfter !== -1) {
					oCflFilterObject = oCflFilterObject.slice(0, indexToRemoveAfter).trim();
				}
				await this.createNewModelUsingAPI('GET',
					"odata/v2/vehicleinspection/VehicleLookupConfiguration?$expand=model" + oCflFilterObject,
					'', this.getCflListViewDataSourceModelName()
				);
				this.setCflTitle('Model List');
				let omodel = this.getView().getModel(this.getCflListViewDataSourceModelName()).getData()
				this.setCflDisplayColumns(['ModelCode', 'ModelName English', 'ModelName Arabic']);
				this.setCflDataColumns(['model_modelCode', 'model/modelNameEnglish', 'model/modelNameArabic']);
				this.setCflValueAndDisplay('/model.modelNameEnglish', 'modelNameEnglish', '', '');
				this.setCflSearchProperty('model/modelNameEnglish');
				this.showCfl('modelIdST', this.getCflListViewDataSourceModelName(), 'd/results', this.onClosecflForModel.bind(this));
			} else {
				MessageToast.show(oBundle.getText("vehInfo_selectManufacturer"));
			}
		},

		onClosecflForModel: function () {
			let oSelectedModel = this.getCflObject();
			console.log("testing data", oSelectedModel);
			let oMainModel = this.getView().getModel("SericeTestModel");
			let newVehicleData = JSON.parse(JSON.stringify(oMainModel.getProperty("/NewVehicleDetails")));
			newVehicleData.modelEnglish = oSelectedModel.model.modelNameEnglish;
			newVehicleData.modelCode = oSelectedModel.model.modelCode;
			newVehicleData.modelArabic = oSelectedModel.model.modelNameArabic;
			oMainModel.setProperty('/NewVehicleDetails', newVehicleData);
			oCflFilterObject = oCflFilterObject + " and model_modelCode eq " + oSelectedModel.model.modelCode

		},

		/**
		 * This Function Call API For PLatetype Value Halper
		 * @memberof:adnoc.vi.vehicleinspection.modone.controller.CreateCustomer
		 * @version: 1.0.0
		 * @since:  20.05.2025
		 * @fires: createNewModelUsingAPI,onClosecflPLateType,getCflListViewDataSourceModelName,showCfl,setCflSearchProperty,setCflTitle,setCflDisplayColumns,setCflDataColumns,setCflValueAndDisplay
		 * @author: Alka Srivastava
		 */
		cflForPLatetype: async function () {
			await this.createNewModelUsingAPI(
				'GET',
				'odata/v2/vehicleinspection/VehicleTypeMasters',
				'',
				this.getCflListViewDataSourceModelName()
			);
			this.setCflTitle("Plate kind")
			this.setCflDisplayColumns(['Code Desc English', 'Code Desc Arabic']);
			this.setCflDataColumns(['typeNameEnglish', 'typeNameArabic']);
			this.setCflValueAndDisplay('/typeNameEnglish', 'typeNameEnglish', '', '');
			this.setCflSearchProperty('typeNameEnglish', 'typeNameArabic');
			this.showCfl('ptIdST', this.getCflListViewDataSourceModelName(), 'd/results', this.onClosecflPLateType.bind(this));
		},

		/**
		 * Function Call For On Close Cfl
		 * @memberof:adnoc.vi.vehicleinspection.modone.controller.CreateCustomer
		 * @version: 1.0.0
		 * @since:  20.05.2025
		 * @fires: onClosecflPLateType
		 * @author: Alka Srivastava
		 */
		onClosecflPLateType: function () {
			let oSelectedModel = this.getCflObject();
			let oMainModel = this.getView().getModel("SericeTestModel");
			let newVehicleData = JSON.parse(JSON.stringify(oMainModel.getProperty("/NewVehicleDetails")));
			newVehicleData.plateTypeEnglish = oSelectedModel.typeNameEnglish;
			newVehicleData.plateTypeCode = oSelectedModel.typeCode;
			newVehicleData.plateTypeArabic = oSelectedModel.typeNameArabic;
			oMainModel.setProperty('/NewVehicleDetails', newVehicleData);
		},

		/**
		 *  Function call api For Kind Value Halper
		 * @memberof:adnoc.vi.vehicleinspection.modone.controller.CreateCustomer
		 * @version: 1.0.0
		 * @since:  20.05.2025
		 * @fires: createNewModelUsingAPI,cionClosecflForKind,getCflListViewDataSourceModelName,showCfl,setCflSearchProperty,setCflTitle,setCflDisplayColumns,setCflDataColumns,setCflValueAndDisplay
		 * @author: Alka Srivastava
		 */
		cflForKind: async function () {
			if (oCflFilterObject != "undefined" && oCflFilterObject != null && oCflFilterObject != "" && oCflFilterObject.includes("manufacture_makeCode") && oCflFilterObject.includes("model_modelCode")) {
				let indexToRemoveAfter = oCflFilterObject.indexOf(" and vehicleKind_kindCode");
				if (indexToRemoveAfter !== -1) {
					oCflFilterObject = oCflFilterObject.slice(0, indexToRemoveAfter).trim();
				}
				await this.createNewModelUsingAPI('GET',
					'odata/v2/vehicleinspection/VehicleLookupConfiguration?$expand=vehicleKind' + oCflFilterObject,
					'', this.getCflListViewDataSourceModelName()
				);
				this.setCflTitle('Kind List');
				this.setCflDisplayColumns(['ModelCode', 'ModelName English', 'ModelName Arabic']);
				this.setCflDataColumns(['vehicleKind_kindCode', 'vehicleKind/kindNameEnglish', 'vehicleKind/kindNameArabic']);
				this.setCflValueAndDisplay('/vehicleKind/kindNameEnglish', '/vehicleKind/kindNameArabic', '', '');
				this.setCflSearchProperty('vehicleKind/kindNameEnglish');
				this.showCfl('platekindST', this.getCflListViewDataSourceModelName(), 'd/results', this.cionClosecflForKind.bind(this));
			} else {
				sap.m.MessageToast.show(oBundle.getText("vehInfo_selectModel"));

			}
		},
		cionClosecflForKind: function () {
			let oSelectedModel = this.getCflObject();
			let oMainModel = this.getView().getModel("SericeTestModel");
			let newVehicleData = JSON.parse(JSON.stringify(oMainModel.getProperty("/NewVehicleDetails")));
			newVehicleData.kindEnglish = oSelectedModel.vehicleKind.kindNameEnglish;
			newVehicleData.kindCode = oSelectedModel.vehicleKind.kindCode;
			newVehicleData.kindArabic = oSelectedModel.vehicleKind.kindNameArabic;
			oMainModel.setProperty('/NewVehicleDetails', newVehicleData);
			oCflFilterObject = oCflFilterObject + " and vehicleKind_kindCode eq " + oSelectedModel.vehicleKind.kindCode
		},

		/**
		 *  Function call api For type value halper
		 * @memberof: adnoc.vi.vehicleinspection.modone.controller.CreateCustomer
		 * @version: 1.0.0
		 * @since: 20.05.2025
		 * @fires: createNewModelUsingAPI,onClosecflForType,getCflListViewDataSourceModelName,showCfl,setCflSearchProperty,setCflTitle,setCflDisplayColumns,setCflDataColumns,setCflValueAndDisplay
		 * @author: Alka Srivastava
		 */

		cflForType: async function () {
			if (oCflFilterObject != "undefined" && oCflFilterObject != null && oCflFilterObject != "" && oCflFilterObject.includes("manufacture_makeCode") && oCflFilterObject.includes("model_modelCode") && oCflFilterObject.includes("vehicleKind_kindCode")) {

				await this.createNewModelUsingAPI('GET',
					'odata/v2/vehicleinspection/VehicleLookupConfiguration?$expand=vehicleType' + oCflFilterObject,
					'', this.getCflListViewDataSourceModelName()
				);
				this.setCflTitle('Type List');
				this.setCflDisplayColumns(['TypeCode', 'TypeName English', 'TypeName Arabic']);
				this.setCflDataColumns(['vehicleType_typeCode', 'vehicleType/typeNameEnglish', 'vehicleKind/typeNameArabic']);
				this.setCflValueAndDisplay('/vehicleType/typeNameEnglish', '/vehicleType/typeNameArabic', '', '');
				this.setCflSearchProperty('vehicleType/typeEnglish');
				this.showCfl('type', this.getCflListViewDataSourceModelName(), 'd/results', this.onClosecflForType.bind(this));
			} else {
				MessageToast.show("Select Kind First.");
			}
		},

		/**
		 * Function Call For On Close Cfl
		 * @memberof:adnoc.vi.vehicleinspection.modone.controller.CreateCustomer
		 * @version: 1.0.0
		 * @since: 20.05.2025
		 * @fires: onClosecflForType
		 * @author: Alka Srivastava
		 */
		onClosecflForType: function () {
			let oSelectedModel = this.getCflObject();
			let oMainModel = this.getView().getModel("SericeTestModel");
			let newVehicleData = JSON.parse(JSON.stringify(oMainModel.getProperty("/NewVehicleDetails")));
			newVehicleData.typeEnglish = oSelectedModel.vehicleType.typeNameEnglish;
			newVehicleData.typeCode = oSelectedModel.vehicleType.typeCode;
			newVehicleData.typeArabic = oSelectedModel.vehicleType.typeNameArabic;
			oMainModel.setProperty('/NewVehicleDetails', newVehicleData);
			oMainModel.setProperty('/vehicleMasters/0/horsePower', oSelectedModel.horsePower);
			oMainModel.setProperty('/vehicleMasters/0/emptyWeight', oSelectedModel.emptyWeight);
			oMainModel.setProperty('/vehicleMasters/0/numberOfDoors', oSelectedModel.numberOfDoor);
			oMainModel.setProperty('/vehicleMasters/0/numberOfCylinders', oSelectedModel.cylinder);
			oMainModel.setProperty('/vehicleMasters/0/emptyWeight', oSelectedModel.emptyWeight);
			oMainModel.setProperty('/vehicleMasters/0/emptyWeight', oSelectedModel.emptyWeight);
		},

		/**
		 *  Function call api for geartype value halper
		 * @memberof:adnoc.vi.vehicleinspection.modone.controller.CreateCustomer
		 * @version: 1.0.0
		 * @since: 20.05.2025
		 * @fires: createNewModelUsingAPI,onClosecflGearType,getCflListViewDataSourceModelName,showCfl,setCflSearchProperty,setCflTitle,setCflDisplayColumns,setCflDataColumns,setCflValueAndDisplay
		 * @author: Alka Srivastava
		 */
		cflForGearType: async function () {
			await this.createNewModelUsingAPI(
				'GET',
				'odata/v2/vehicleinspection/GearTypeMasters',
				'',
				this.getCflListViewDataSourceModelName()
			);
			this.setCflTitle("fuel type")
			this.setCflDisplayColumns(['Gear Code', 'Gear Desc English', 'Code Desc Arabic']);
			this.setCflDataColumns(['codeId', 'codeDescEnglish', 'codeDescArabic']);
			this.setCflValueAndDisplay('/codeDescEnglish', 'codeDescEnglish', '', '');
			this.setCflSearchProperty('codeDescEnglish', 'codeDescEnglish');
			this.showCfl('gearIdST', this.getCflListViewDataSourceModelName(), 'd/results', this.onClosecflGearType.bind(this));
		},

		/**
		 * Function Call For on close cfl
		 * @memberof: adnoc.vi.vehicleinspection.modone.controller.CreateCustomer
		 * @version: 1.0.0
		 * @since:  20.05.2025
		 * @fires: onClosecflGearType
		 * @author: Alka Srivastava
		 */
		onClosecflGearType: function () {
			let oSelectedModel = this.getCflObject();
			let oMainModel = this.getView().getModel("SericeTestModel");
			let newVehicleData = JSON.parse(JSON.stringify(oMainModel.getProperty("/NewVehicleDetails")));
			newVehicleData.gearTypeEnglish = oSelectedModel.codeDescEnglish;
			newVehicleData.gearTypeCode = oSelectedModel.codeId;
			newVehicleData.gearTypeArabic = oSelectedModel.codeDescArabic;
			oMainModel.setProperty('/NewVehicleDetails', newVehicleData);
		},

		/**
		 *  Function call api For fueltype value halper
		 * @memberof: adnoc.vi.vehicleinspection.modone.controller.CreateCustomer
		 * @version: 1.0.0
		 * @since:  20.05.2025
		 * @fires: createNewModelUsingAPI,onClosecflFuelType,getCflListViewDataSourceModelName,showCfl,setCflSearchProperty,setCflTitle,setCflDisplayColumns,setCflDataColumns,setCflValueAndDisplay
		 * @author: Alka Srivastava
		 */
		cflForFuelType: async function () {
			await this.createNewModelUsingAPI(
				'GET',
				'odata/v2/vehicleinspection/FuelTypeMasters',
				'',
				this.getCflListViewDataSourceModelName()
			);
			this.setCflTitle("fuel type")
			this.setCflDisplayColumns(['Code Desc English', 'Code Desc Arabic']);
			this.setCflDataColumns(['codeDescEnglish', 'codeDescArabic']);
			this.setCflValueAndDisplay('/codeDescEnglish', 'codeDescEnglish', '', '');
			this.setCflSearchProperty('codeDescEnglish', 'codeDescArabic');
			this.showCfl('fuelIdST', this.getCflListViewDataSourceModelName(), 'd/results', this.onClosecflFuelType.bind(this));
		},

		/**
		 * Function Call For on close cfl
		 * @memberof: adnoc.vi.vehicleinspection.modone.controller.CreateCustomer
		 * @version: 1.0.0
		 * @since: 20.05.2025
		 * @fires: onClosecflFuelType
		 * @author: Alka Srivastava
		 */
		onClosecflFuelType: function () {
			let oSelectedModel = this.getCflObject();
			let oMainModel = this.getView().getModel("SericeTestModel");
			let newVehicleData = JSON.parse(JSON.stringify(oMainModel.getProperty("/NewVehicleDetails")));
			newVehicleData.fuelTypeEnglish = oSelectedModel.codeDescEnglish;
			newVehicleData.fuelTypeCode = oSelectedModel.codeId;
			newVehicleData.fuelTypeArabic = oSelectedModel.codeDescArabic;
			oMainModel.setProperty('/NewVehicleDetails', newVehicleData);
		},

		/**
		 *  Function call api For bodycolour value halper
		 * @memberof: adnoc.vi.vehicleinspection.modone.controller.CreateCustomer
		 * @version: 1.0.0
		 * @since:  20.05.2025
		 * @fires: createNewModelUsingAPI,onClosecflForBodyColour,getCflListViewDataSourceModelName,showCfl,setCflSearchProperty,setCflTitle,setCflDisplayColumns,setCflDataColumns,setCflValueAndDisplay
		 * @author: Alka Srivastava
		 */
		cflForBodyColour: async function () {
			await this.createNewModelUsingAPI(
				'GET',
				'odata/v2/vehicleinspection/BodyColorMasters',
				'',
				this.getCflListViewDataSourceModelName()
			);
			this.setCflTitle('BodyColor List');
			this.setCflDisplayColumns(['BodyColor Code', 'BodyColorName English', 'BodyColorName Arabic']);
			this.setCflDataColumns(['colorCode', 'bodyColorEnglish', 'bodyColorArabic']);
			this.setCflValueAndDisplay('/bodyColorEnglish', 'manufacturerEnglish', '', '');
			this.setCflSearchProperty('bodyColorEnglish');
			this.showCfl('colorIdST', this.getCflListViewDataSourceModelName(), 'd/results', this.onClosecflForBodyColour.bind(this));
		},

		/**
		 * Function call for on close cfl
		 * @memberof: adnoc.vi.vehicleinspection.modone.controller.CreateCustomer
		 * @version: 1.0.0
		 * @since:  20.05.2025
		 * @fires: onClosecflForBodyColour
		 * @author: Alka Srivastava
		 */
		onClosecflForBodyColour: function () {
			let oSelectedModel = this.getCflObject();
			let oMainModel = this.getView().getModel("SericeTestModel");
			let newVehicleData = JSON.parse(JSON.stringify(oMainModel.getProperty("/NewVehicleDetails")));
			newVehicleData.bodyColorEnglish = oSelectedModel.bodyColorEnglish;
			newVehicleData.bodyColorCode = oSelectedModel.colorCode;
			newVehicleData.bodyColorArabic = oSelectedModel.bodyColorArabic;
			oMainModel.setProperty('/NewVehicleDetails', newVehicleData);
		},

		/**
		 *  Function call api for Steering Value Halper
		 * @memberof: adnoc.vi.vehicleinspection.modone.controller.CreateCustomer
		 * @version: 1.0.0
		 * @since: 20.05.2025
		 * @fires: createNewModelUsingAPI,onClosecflForSteering,getCflListViewDataSourceModelName,showCfl,setCflSearchProperty,setCflTitle,setCflDisplayColumns,setCflDataColumns,setCflValueAndDisplay
		 * @author: Alka Srivastava
		 */
		cflForSteering: async function () {
			await this.createNewModelUsingAPI(
				'GET',
				'odata/v2/vehicleinspection/SteeringSideMasters',
				'',
				this.getCflListViewDataSourceModelName()
			);
			this.setCflTitle('Steering Side List');
			this.setCflDisplayColumns(['Steering Code', 'Steering Name English', 'Steering Name Arabic']);
			this.setCflDataColumns(['steeringCode', 'englishName', 'arabicName']);
			this.setCflValueAndDisplay('/englishName', 'englishName', '', '');
			this.setCflSearchProperty('englishName');
			this.showCfl('steeringIdST', this.getCflListViewDataSourceModelName(), 'd/results', this.onClosecflForSteering.bind(this));

		},
		/**
		 * Function call for on close cfl
		 * @memberof: adnoc.vi.vehicleinspection.modone.controller.CreateCustomer
		 * @version: 1.0.0
		 * @since: 20.05.2025
		 * @fires: onClosecflForSteering
		 * @author: Alka Srivastava
		 */
		onClosecflForSteering: function () {
			let oSelectedModel = this.getCflObject();
			let oMainModel = this.getView().getModel("SericeTestModel");
			let newVehicleData = JSON.parse(JSON.stringify(oMainModel.getProperty("/NewVehicleDetails")));
			newVehicleData.steeringSideEnglish = oSelectedModel.englishName;
			newVehicleData.steeringSideCode = oSelectedModel.steeringCode;
			newVehicleData.steeringSideArabic = oSelectedModel.arabicName;
			oMainModel.setProperty('/NewVehicleDetails', newVehicleData);
		},

		/**
		 *  Function call api for weight value halper
		 * @memberof:adnoc.vi.vehicleinspection.modone.controller.CreateCustomer
		 * @version: 1.0.0
		 * @since:  20.05.2025
		 * @fires: createNewModelUsingAPI,onClosecflForweight,getCflListViewDataSourceModelName,showCfl,setCflSearchProperty,setCflTitle,setCflDisplayColumns,setCflDataColumns,setCflValueAndDisplay
		 * @author: Alka Srivastava
		 */
		cflForweight: async function () {
			await this.createNewModelUsingAPI(
				'GET',
				'odata/v2/vehicleinspection/WeightKindMasters',
				'',
				this.getCflListViewDataSourceModelName()
			);
			this.setCflTitle('Weight Kind List');
			this.setCflDisplayColumns(['Weight Kind Code', 'Weight Kind English', 'Weight Kind Arabic']);
			this.setCflDataColumns(['weightKindCode', 'codeDescEnglish', 'codeDescArabic']);
			this.setCflValueAndDisplay('/codeDescEnglish', 'codeDescEnglish', '', '');
			this.setCflSearchProperty('codeDescEnglish');
			this.showCfl('weightIdST', this.getCflListViewDataSourceModelName(), 'd/results', this.onClosecflForweight.bind(this));
		},
		/**
		 * Function call for on close cfl
		 * @memberof: adnoc.vi.vehicleinspection.modone.controller.CreateCustomer
		 * @version: 1.0.0
		 * @since:  20.05.2025
		 * @fires: onClosecflForweight
		 * @author: Alka Srivastava
		 */
		onClosecflForweight: function () {
			let oSelectedModel = this.getCflObject();
			let oMainModel = this.getView().getModel("SericeTestModel");
			let newVehicleData = JSON.parse(JSON.stringify(oMainModel.getProperty("/NewVehicleDetails")));
			newVehicleData.weightDiscEnglish = oSelectedModel.codeDescEnglish;
			newVehicleData.weightDiscCode = oSelectedModel.weightKindCode;
			newVehicleData.weightDiscArabic = oSelectedModel.codeDescArabic;
			oMainModel.setProperty('/NewVehicleDetails', newVehicleData);
		},

		/**
		 *  function call api for carremark value halper
		 * @memberof: adnoc.vi.vehicleinspection.modone.controller.CreateCustomer
		 * @version: 1.0.0
		 * @since: 20.05.2025
		 * @fires: createNewModelUsingAPI,onClosecflForCarRemark,getCflListViewDataSourceModelName,showCfl,setCflSearchProperty,setCflTitle,setCflDisplayColumns,setCflDataColumns,setCflValueAndDisplay
		 * @author: Alka Srivastava
		 */
		cflForCarRemark: async function () {
			await this.createNewModelUsingAPI(
				'GET',
				'odata/v2/vehicleinspection/RegCarRemarkMasters',
				'',
				this.getCflListViewDataSourceModelName()
			);
			this.setCflTitle('Car Remark List');
			this.setCflDisplayColumns(['Steering Code', 'Steering Name English', 'Steering Name Arabic']);
			this.setCflDataColumns(['steeringCode', 'englishName', 'arabicName']);
			this.setCflValueAndDisplay('/englishName', 'englishName', '', '');
			this.setCflSearchProperty('englishName');
			this.showCfl('carIdST', this.getCflListViewDataSourceModelName(), 'd/results', this.onClosecflForCarRemark.bind(this));
		},

		/**
		 * Function call for on close cfl
		 * @memberof:adnoc.vi.vehicleinspection.modone.controller.CreateCustomer
		 * @version: 1.0.0
		 * @since: 20.05.2025
		 * @fires: onClosecflForCarRemark
		 * @author: Alka Srivastava
		 */
		onClosecflForCarRemark: function () {
			let oSelectedModel = this.getCflObject();
			let oMainModel = this.getView().getModel("SericeTestModel");
			let newVehicleData = JSON.parse(JSON.stringify(oMainModel.getProperty("/NewVehicleDetails")));
			newVehicleData.regCarRemarkEnglish = oSelectedModel.englishName;
			newVehicleData.regCarRemarkCode = oSelectedModel.steeringCode;
			newVehicleData.regCarRemarkArabic = oSelectedModel.arabicName;
			oMainModel.setProperty('/NewVehicleDetails', newVehicleData);
		},

		/**
		 *  Function call api for lostplate value halper
		 * @memberof: adnoc.vi.vehicleinspection.modone.controller.CreateCustomer
		 * @version: 1.0.0
		 * @since:  20.05.2025
		 * @fires: createNewModelUsingAPI,onClosecflForLostPlate,getCflListViewDataSourceModelName,showCfl,setCflSearchProperty,setCflTitle,setCflDisplayColumns,setCflDataColumns,setCflValueAndDisplay
		 * @author: Alka Srivastava
		 */
		cflForLostPlate: async function () {
			await this.createNewModelUsingAPI(
				'GET',
				'odata/v2/vehicleinspection/LostPlateMasters',
				'',
				this.getCflListViewDataSourceModelName()
			);
			this.setCflTitle('Car Remark List');
			this.setCflDisplayColumns([' Lost Plate Code', 'Lost Plate Name English', 'Lost Plate Name Arabic']);
			this.setCflDataColumns(['codeId', 'codeDescEnglish', 'codeDescArabic']);
			this.setCflValueAndDisplay('/codeDescEnglish', 'codeDescEnglish', '', '');
			this.setCflSearchProperty('codeDescEnglish');
			this.showCfl('LplateIdST', this.getCflListViewDataSourceModelName(), 'd/results', this.onClosecflForLostPlate.bind(this));
		},
		/**
		 * Function call for on close cfl
		 * @memberof:adnoc.vi.vehicleinspection.modone.controller.CreateCustomer
		 * @version: 1.0.0
		 * @since: 20.05.2025
		 * @fires: onClosecflForLostPlate
		 * @author: Alka Srivastava
		 */
		onClosecflForLostPlate: function () {
			let oSelectedModel = this.getCflObject();
			let oMainModel = this.getView().getModel("SericeTestModel");
			let newVehicleData = JSON.parse(JSON.stringify(oMainModel.getProperty("/NewVehicleDetails")));
			newVehicleData.lostPlateEnglish = oSelectedModel.codeDescEnglish;
			newVehicleData.lostPlateCode = oSelectedModel.codeId;
			newVehicleData.lostPlateArabic = oSelectedModel.codeDescArabic;
			oMainModel.setProperty('/NewVehicleDetails', newVehicleData);
		},

		/**
		 *  Function call api for damageplate value halper
		 * @memberof: adnoc.vi.vehicleinspection.modone.controller.CreateCustomer
		 * @version: 1.0.0
		 * @since:  20.05.2025
		 * @fires: createNewModelUsingAPI,onClosecflForDamagePlate,getCflListViewDataSourceModelName,showCfl,setCflSearchProperty,setCflTitle,setCflDisplayColumns,setCflDataColumns,setCflValueAndDisplay
		 * @author: Alka Srivastava
		 */
		cflForDamagePlate: async function () {
			await this.createNewModelUsingAPI(
				'GET',
				'odata/v2/vehicleinspection/DamagedPlateMasters',
				'',
				this.getCflListViewDataSourceModelName()
			);
			this.setCflTitle('Car Remark List');
			this.setCflDisplayColumns([' Damage Plate Code', 'Damage Plate Name English', 'Damage Plate Name Arabic']);
			this.setCflDataColumns(['codeId', 'codeDescEnglish', 'codeDescArabic']);
			this.setCflValueAndDisplay('/codeDescEnglish', 'codeDescEnglish', '', '');
			this.setCflSearchProperty('codeDescEnglish');
			this.showCfl('DplateIdST', this.getCflListViewDataSourceModelName(), 'd/results', this.onClosecflForDamagePlate.bind(this));
		},

		/**
		 * Function call for on close cfl
		 * @memberof: adnoc.vi.vehicleinspection.modone.controller.CreateCustomer
		 * @version: 1.0.0
		 * @since:  20.05.2025
		 * @fires: onClosecflForDamagePlate
		 * @author: Alka Srivastava
		 */
		onClosecflForDamagePlate: function () {
			let oSelectedModel = this.getCflObject();
			let oMainModel = this.getView().getModel("SericeTestModel");
			let newVehicleData = JSON.parse(JSON.stringify(oMainModel.getProperty("/NewVehicleDetails")));
			newVehicleData.damagePlateEnglish = oSelectedModel.codeDescEnglish;
			newVehicleData.damagePlateCode = oSelectedModel.codeId;
			newVehicleData.damagePlateArabic = oSelectedModel.codeDescArabic;
			oMainModel.setProperty('/NewVehicleDetails', newVehicleData);
		},

		/**
		 * Function call api for mileagemtrstatus value halper
		 * @memberof: adnoc.vi.vehicleinspection.modone.controller.CreateCustomer
		 * @version: 1.0.0
		 * @since: 20.05.2025
		 * @fires: createNewModelUsingAPI,onClosecflForMileageMtrStatus,getCflListViewDataSourceModelName,showCfl,setCflSearchProperty,setCflTitle,setCflDisplayColumns,setCflDataColumns,setCflValueAndDisplay,onArmedVehicle
		 * onModifiedVehicle,onHandicappedVehicle,onAccidentVehicle,onGCCVehicle
		 * @author: Alka Srivastava
		 */
		cflForMileageMtrStatus: async function () {
			await this.createNewModelUsingAPI(
				'GET',
				'odata/v2/vehicleinspection/MileageMtrStatusMasters',
				'',
				this.getCflListViewDataSourceModelName()
			);
			this.setCflTitle('Milage List');
			this.setCflDisplayColumns(['MileageMtr Code', 'MileageMtr Name English', 'MileageMtr Name Arabic']);
			this.setCflDataColumns(['codeId', 'codeDescEnglish', 'codeDescArabic']);
			this.setCflValueAndDisplay('/codeDescEnglish', 'codeDescEnglish', '', '');
			this.setCflSearchProperty('codeDescEnglish');
			this.showCfl('milageIdST', this.getCflListViewDataSourceModelName(), 'd/results', this.onClosecflForMileageMtrStatus.bind(this));
		},
		/**
		 * Function Call For On Close Cfl
		 * @memberof: adnoc.vi.vehicleinspection.modone.controller.CreateCustomer
		 * @version: 1.0.0
		 * @since: 20.05.2025
		 * @fires: onClosecflForMileageMtrStatus
		 * @author: Alka Srivastava
		 */
		onClosecflForMileageMtrStatus: function () {
			let oSelectedModel = this.getCflObject();
			let oMainModel = this.getView().getModel("SericeTestModel");
			let newVehicleData = JSON.parse(JSON.stringify(oMainModel.getProperty("/NewVehicleDetails")));
			newVehicleData.mileageMtrEnglish = oSelectedModel.codeDescEnglish;
			newVehicleData.mileageCode = oSelectedModel.codeId;
			newVehicleData.mileageMtrArabic = oSelectedModel.codeDescArabic;
			oMainModel.setProperty('/NewVehicleDetails', newVehicleData);
		},

		/**
		 * Function call for set onArmedVehicle on main model
		 * @memberof:adnoc.vi.vehicleinspection.modone.controller.CreateCustomer
		 * @version: 1.0.0
		 * @since: 20.05.2025
		 * @fires: onArmedVehicle
		 * @author: Alka Srivastava
		 */
		onArmedVehicle: function (oEvent) {
			let bSelected = oEvent.getParameter("selected"); // boolean: true or false
			let oModel = this.getView().getModel("SericeTestModel");
			oModel.setProperty("/NewVehicleDetails/isArmedVehicle", bSelected ? "true" : "false");
		},

		/**
		 * Function call for set onModifiedVehicle on main model
		 * @memberof: adnoc.vi.vehicleinspection.modone.controller.CreateCustomer
		 * @version: 1.0.0
		 * @since:  20.05.2025
		 * @fires: onModifiedVehicle
		 * @author: Alka Srivastava
		 */
		onModifiedVehicle: function (oEvent) {
			let bSelected = oEvent.getParameter("selected"); // boolean: true or false
			let oModel = this.getView().getModel("SericeTestModel");
			oModel.setProperty("/NewVehicleDetails/isModifiedVehicle", bSelected ? true : false);
		},

		/**
		 * Function Call for set onHandicappedVehicle on main model
		 * @memberof:adnoc.vi.vehicleinspection.modone.controller.CreateCustomer
		 * @version: 1.0.0
		 * @since:  20.05.2025
		 * @fires: onHandicappedVehicle
		 * @author: Alka Srivastava
		 */
		onHandicappedVehicle: function (oEvent) {
			let bSelected = oEvent.getParameter("selected"); // boolean: true or false
			let oModel = this.getView().getModel("SericeTestModel");
			oModel.setProperty("/NewVehicleDetails/isHandicappedVehicle", bSelected ? true : false);
		},

		/**
		 * Function call for set onAccidentVehicle on main model
		 * @memberof: adnoc.vi.vehicleinspection.modone.controller.CreateCustomer
		 * @version: 1.0.0
		 * @since:  20.05.2025
		 * @fires: onAccidentVehicle
		 * @author: Alka Srivastava
		 */
		onAccidentVehicle: function (oEvent) {
			let bSelected = oEvent.getParameter("selected"); // boolean: true or false
			let oModel = this.getView().getModel("SericeTestModel");
			oModel.setProperty("/NewVehicleDetails/isAccidentVehicle", bSelected ? true : false);
		},
		/**
		 * Function call for set onGCCVehicle on main model 
		 * @memberof:adnoc.vi.vehicleinspection.modone.controller.CreateCustomer
		 * @version: 1.0.0
		 * @since: 20.05.2025
		 * @fires: onGCCVehicle
		 * @author: Alka Srivastava
		 */
		onGCCVehicle: function (oEvent) {
			let bSelected = oEvent.getParameter("selected"); // boolean: true or false
			let oModel = this.getView().getModel("SericeTestModel");
			oModel.setProperty("/NewVehicleDetails/isGCCVehicle", bSelected ? true : false);
		},

		/**
		 * Function call for close screen
		 * @memberof:adnoc.vi.vehicleinspection.modone.controller.CreateCustomer
		 * @version: 1.0.0
		 * @since:  20.05.2025
		 * @fires: onCloseChangeInfo
		 * @author: Alka Srivastava
		 */
		onCloseChangeInfo: async function () {
			this.ChangeinfoFrag.close();
			await this.updateServiceTestModel();
			let oModel = this.getView().getModel("SericeTestModel");
			oModel.refresh(true)
		},

		/**
		 * Function call for save button
		 * @memberof: adnoc.vi.vehicleinspection.modone.controller.CreateCustomer
		 * @version: 1.0.0
		 * @since: 20.05.2025
		 * @fires: onsave
		 * @author: Alka Srivastava
		 */
		onsave: async function () {
			await this.onSaveChangevechicleInfo(Constant.STATUS.INPROGRESS)
			this.onCloseChangeInfo();
		},

		/**
		 * Function call for onconfirm button
		 * @memberof: adnoc.vi.vehicleinspection.modone.controller.CreateCustomer
		 * @version: 1.0.0
		 * @since:  20.05.2025
		 * @fires: onconfirm
		 * @author: Alka Srivastava
		 */
		onconfirm: async function () {
			await this.onSaveChangevechicleInfo(Constant.STATUS.COMPLETE)
			this.onCloseChangeInfo();
		},

		/**
		 * @description: Function call for savechangevechicleInfo
		 * @memberof:adnoc.vi.vehicleinspection.modone.controller.CreateCustomer
		 * @version: 1.0.0
		 * @since: 20.05.2025
		 * @author: Alka Srivastava
		 * @fires: onSaveChangevechicleInfo,updateServiceTestModel,generateNewPayload,
		 */
		onSaveChangevechicleInfo: async function (status) {
			let oModel = this.getView().getModel("SericeTestModel");
			let oVehicleDetails = oModel.getProperty("/VehicleDetails");
			let oNewVehicleDetails = oModel.getProperty("/NewVehicleDetails");
			let oVehicleLabels = oModel.getProperty("/VehicleLabels");
			let oStartDateEndDate = oModel.getProperty("/StartDateEndDate");
			let payload = [];
			let plateNumber = oVehicleDetails.plateNumber || "N/A"; // Default if missing
			let arabickey = {
				"bodyColorEnglish": "bodyColorArabic",
				"fuelTypeEnglish": "fuelTypeArabic",
				"gearTypeEnglish": "gearTypeArabic",
				"insuranceKindEnglish": "insuranceKindArabic",
				"kindEnglish": "kindArabic",
				"manfacturerEnglish": "manfacturerArabic",
				"modelEnglish": "modelArabic",
				"nationalityEnglish": "nationalityArabic",
				"plateColorEnglish": "plateColorArabic",
				"plateKindEnglish": "plateKindArabic",
				"plateSourceEnglish": "plateSourceArabic",
				"plateTypeEnglish": "plateTypeArabic",
				"steeringSideEnglish": "steeringSideArabic",
				"typeEnglish": "typeArabic",
				"weightDiscEnglish": "weightDiscArabic"
			};
			const codekey = {
				"bodyColorEnglish": "bodyColorCode",
				"fuelTypeEnglish": "fuelTypeCode",
				"gearTypeEnglish": "gearTypeCode",
				"kindEnglish": "kindCode",
				"manfacturerEnglish": "manfacturerCode",
				"modelEnglish": "modelCode",
				"nationalityEnglish": "nationalityCode",
				"plateColorEnglish": "plateColorCode",
				"plateKindEnglish": "plateKindCode",
				"plateSourceEnglish": "plateSourceCode",
				"plateTypeEnglish": "plateTypeCode",
				"steeringSideEnglish": "steeringSideCode",
				"typeEnglish": "typeCode",
				"weightDiscEnglish": "weightDiscCode"
			};

			Object.keys(oVehicleLabels).forEach((key) => {
				let oldValue = oVehicleDetails[key] || "N/A";
				let newValue = oNewVehicleDetails[key] || "N/A";
				let newValuecode = oNewVehicleDetails[codekey[key]] || "N/A";
				let newValuearabic = oNewVehicleDetails[arabickey[key]] || "N/A";
				let oldValuecode = oVehicleDetails[codekey[key]] || "N/A";
				let oldValuearabic = oVehicleDetails[arabickey[key]] || "N/A";
				// If value has changed, add to the payload
				if (oldValue !== newValue) {
					payload.push({
						fieldLabelEnglish: oVehicleLabels[key] || key,  // Get label or default key
						fieldLabelArabic: oVehicleLabels[key] || key,   // Assuming Arabic label is same (modify if needed)
						plateNumber: plateNumber.toString(),
						oldValueCode: oldValuecode.toString(),
						OldTextEnglish: oldValue.toString(),
						OldTextArabic: oldValuearabic.toString(), // Change this if Arabic translations are available
						newValueCode: newValuecode.toString(),
						newTextEnglish: newValue.toString(),
						newTextArabic: newValuearabic.toString(), // Change this if Arabic translations are available
					});
				}
			});
			let charStatusList = this.charStatusData;
			const filteredResults = charStatusList.vehOrdInspLinesTestChars.results.filter(item => item.applicableTestName === "VI_CHANGE_VEHICLE_INFO");
			const vehicleOrderGuid = filteredResults.map(item => ({
				VehicleOrderInspectionLinesTestCharUUID: item.VehicleOrderInspectionLinesTestCharUUID
			}));
			const a = vehicleOrderGuid[0].VehicleOrderInspectionLinesTestCharUUID
			let data = {
				VehicleOrderInspectionLinesTestCharUUID: vehicleOrderGuid[0].VehicleOrderInspectionLinesTestCharUUID,
				testStatus: status,
				"testInspectedBy": "Admin",
				"testComments": oStartDateEndDate.testComments,
				"applicableTestName": "VI_CHANGE_VEHICLE_INFO",
				vehicleOrderInspectionChangeVehicleLogs: payload
			}
			if (data.testStatus == "INPROGRESS" && oStartDateEndDate.ChangeinfoStartdate == null) {
				data.testInspectionStartDate = this.getDateFromatIn_ddMMyyyy_HHmm(new Date()); // sets current date-time
			}
			if (data.testStatus == "COMPLETE" && oStartDateEndDate.ChangeinfoEnddate == null) {
				data.testInspectionEndDate = this.getDateFromatIn_ddMMyyyy_HHmm(new Date()); // sets current date-time
			}
			console.log("Generated Payload:", data);
			if (status === Constant.STATUS.COMPLETE) {
				try {
					function generateNewPayload(oldPayload, newPayload) {
						const result = {};
						for (const key in oldPayload) {
							if (oldPayload.hasOwnProperty(key)) {
								// Get the value from the new payload
								const newValue = newPayload[key];
								// Ensure the data type of the new value matches the old value
								if (newValue !== undefined) {
									if (typeof oldPayload[key] === 'number') {
										result[key] = parseFloat(newValue);
									} else if (typeof oldPayload[key] === 'boolean') {
										result[key] = newValue === 'true' || newValue === true; // Handle string and boolean
									} else if (typeof oldPayload[key] === 'object' && oldPayload[key] !== null) {
										// If the value is an object, you may want to treat it differently or recursively apply the function
										result[key] = newValue; // In this case we just overwrite it directly
									} else {
										result[key] = newValue;
									}
								} else {
									// If no value is available in newPayload, keep the old one
									result[key] = oldPayload[key];
								}
							}
						}
						return result;
					}
					// Example Usage
					let masterdata = generateNewPayload(oVehicleDetails, oNewVehicleDetails);
					masterdata.registrationExpiryDate = null; // Alka ma'am need to change  
					console.log(JSON.stringify(masterdata, null, 2));
					delete masterdata.customerMasters;
					delete masterdata.__metadata;
					delete masterdata.createdAt;
					delete masterdata.createdBy;
					delete masterdata.modifiedAt;
					delete masterdata.modifiedBy;
					delete masterdata.undefined;
					delete masterdata.serviceRequestNo;
					delete masterdata.orderTotal;
					delete masterdata.currencyCode;
					delete masterdata.totalVAT;
					delete masterdata.customerType;
					masterdata.mileage = masterdata.mileage != null ? masterdata.mileage.toString() : null;
					masterdata.cubicCapacity = masterdata.cubicCapacity != null ? masterdata.cubicCapacity.toString() : null;
					// First PATCH call
					await this.saveEntryForm(
						"PATCH",
						"odata/v2/vehicleinspection/VehicleMasters(" + oNewVehicleDetails["vehicleMastersUUID"] + ")",
						masterdata
					);
					// Second PATCH call
					await this.saveEntryForm(
						"PATCH",
						"odata/v2/vehicleinspection/VehicleOrderInspectionLinesTestChar(" + vehicleOrderGuid[0].VehicleOrderInspectionLinesTestCharUUID + ")",
						data
					);
					await this.updateServiceTestModel();
					let response = this.getApiResponseObject();
					if (response) {
						MessageToast.show(" Data Save successfully ");
						setTimeout(function () {
							// this.router.navTo(this.getBackwardRoute());
							this.getOwnerComponent().getRouter().navTo(this.getBackwardRoute());
						}.bind(this), 500);
					}

				} catch (error) {
					// Log or handle the error - nothing is called if any part fails
					console.error("Update failed: ", error);
					MessageBox.error("Failed to save. Please try again.", error.message);
				}
			} else {

				await this.saveEntryForm("PATCH", "odata/v2/vehicleinspection/VehicleOrderInspectionLinesTestChar(" + vehicleOrderGuid[0].VehicleOrderInspectionLinesTestCharUUID + ")", data);
				let response = this.getApiResponseObject();
				await this.updateServiceTestModel();
				if (response) {
					MessageToast.show(" Data Save successfully ");
					setTimeout(function () {
						// this.router.navTo(this.getBackwardRoute());
						this.getOwnerComponent().getRouter().navTo(this.getBackwardRoute());
					}.bind(this), 500);
				}
			}
		},

		/**
		 *  Function call for savechngestatus 
		 * @memberof: adnoc.vi.vehicleinspection.modone.controller.CreateCustomer
		 * @version: 1.0.0
		 * @since: 20.05.2025
		 * @fires: onSaveChngeStatus,
		 * @author: Alka Srivastava
		 */
		onSaveChngeStatus: function () {
			this.saveEntryForm("GET", "odata/v2/vehicleinspection/vehOrdInspLinesTestChars(" + vehicleOrderGuid[0].VehicleOrderInspectionLinesTestCharUUID + ")", data);
			this.saveEntryForm("GET", sUrl, data)
				.then(() => {
					let response = this.getApiResponseObject();
					console.log("API Response:", response);
				})
		},

		/**
		 *  Function call For cfl Suggestion 
		 * @memberof: adnoc.vi.vehicleinspection.modone.controller.CreateCustomer
		 * @version: 1.0.0
		 * @since:  20.05.2025
		 * @fires: cflSuggestionModel
		 * @author: Alka Srivastava
		 */
		cflSuggestionModel: async function () {
			// Define all the API calls as promises
			const apiCalls = [
				this.createNewModelUsingAPI('GET', 'odata/v2/vehicleinspection/BodyColorMasters', '', 'cflBodyColorMasters'),
				this.createNewModelUsingAPI('GET', 'odata/v2/vehicleinspection/CountryMasters', '', 'cflCountryMasters'),
				this.createNewModelUsingAPI('GET', 'odata/v2/vehicleinspection/VehicleLookupConfiguration?$expand=manufacture', '', 'cflManufacturerMasters'),
				this.createNewModelUsingAPI('GET', 'odata/v2/vehicleinspection/VehicleLookupConfiguration?$expand=model', '', 'cflModelMasters'),
				this.createNewModelUsingAPI('GET', 'odata/v2/vehicleinspection/VehicleTypeMasters', '', 'cflPlateTypeMasters'),
				this.createNewModelUsingAPI('GET', 'odata/v2/vehicleinspection/VehicleLookupConfiguration?$expand=vehicleKind', '', 'cflKindMasters'),
				this.createNewModelUsingAPI('GET', 'odata/v2/vehicleinspection/VehicleLookupConfiguration?$expand=vehicleType', '', 'cflTypeMasters'),
				this.createNewModelUsingAPI('GET', 'odata/v2/vehicleinspection/GearTypeMasters', '', 'cflGearTypeMasters'),
				this.createNewModelUsingAPI('GET', 'odata/v2/vehicleinspection/FuelTypeMasters', '', 'cflFuelTypeMasters'),
				this.createNewModelUsingAPI('GET', 'odata/v2/vehicleinspection/SteeringSideMasters', '', 'cflSteeringSideMasters'),
				this.createNewModelUsingAPI('GET', 'odata/v2/vehicleinspection/WeightKindMasters', '', 'cflWeightKindMasters'),
				this.createNewModelUsingAPI('GET', 'odata/v2/vehicleinspection/RegCarRemarkMasters', '', 'cflCarRemarkMasters'),
				this.createNewModelUsingAPI('GET', 'odata/v2/vehicleinspection/LostPlateMasters', '', 'cflLostPlateMasters'),
				this.createNewModelUsingAPI('GET', 'odata/v2/vehicleinspection/DamagedPlateMasters', '', 'cflDamagePlateMasters'),
				this.createNewModelUsingAPI('GET', 'odata/v2/vehicleinspection/MileageMtrStatusMasters', '', 'cflMileageMtrStatusMasters')
			];

			// Wait for all API calls to finish
			try {
				await Promise.all(apiCalls);
			} catch (error) {

			}
		},

		/**
		 *  Function call for cfl suggestion validation
		 * @memberof: adnoc.vi.vehicleinspection.modone.controller.CreateCustomer
		 * @version: 1.0.0
		 * @since:  20.05.2025
		 * @fires: cflSuggestionValidation
		 * @author: Alka Srivastava
		 */
		cflSuggestionValidation: function (oEvent) {
			const oInput = oEvent.getSource();
			const sInputValue = oInput.getValue().trim();
			const oBindingInfo = oInput.getBindingInfo("suggestionRows");
			const sModelName = oBindingInfo.model;
			const oCflModel = this.getView().getModel(sModelName);
			const aSuggestions = oCflModel.getProperty("/d/results");
			const oBindingInfoValue = oInput.getBindingInfo("value");
			if (oBindingInfoValue?.parts?.[0]?.path) {
				const sFullPath = oBindingInfoValue.parts[0].path; // e.g., 'NewVehicleDetails/bodyColorEnglish'
				const sProperty = sFullPath.split('/').pop(); // → 'bodyColorEnglish'
				const isValid = aSuggestions.some(item =>
					item[sProperty]?.toLowerCase() === sInputValue.toLowerCase()
				);
				if (!isValid) {
					oInput.setValue("");
					oInput.setValueState("Error");
					//sap.m.MessageBox.error("Invalid Value. Please select from the list.");
					sap.m.MessageToast.show(oBundle.getText("vehInfo_InvalidValue"));
				}
			}
		},

		/**
		 * Function call for set select bodycolour
		 * @memberof: adnoc.vi.vehicleinspection.modone.controller.CreateCustomer
		 * @version: 1.0.0
		 * @since: 20.05.2025
		 * @fires: onSelectbodycolor
		 * @author: Alka Srivastava
		 */
		onSelectbodycolor: function (oEvent) {
			const oSelectedRow = oEvent.getParameter("selectedRow");
			const oInput = oEvent.getSource();
			const oBindingInfo = oInput.getBindingInfo("suggestionRows");
			const sModelName = oBindingInfo.model;
			const oSelectedModel = oSelectedRow.getBindingContext(sModelName).getObject();
			const oValueBindingInfo = oInput.getBindingInfo("value");
			const oBindedModelName = oValueBindingInfo.parts[0].model;
			let oMainModel = this.getView().getModel(oBindedModelName);
			let newVehicleData = JSON.parse(JSON.stringify(oMainModel.getProperty("/NewVehicleDetails")));
			newVehicleData.bodyColorEnglish = oSelectedModel.bodyColorEnglish;
			newVehicleData.bodyColorCode = oSelectedModel.colorCode;
			newVehicleData.bodyColorArabic = oSelectedModel.bodyColorArabic;
			oMainModel.setProperty('/NewVehicleDetails', newVehicleData);
			return false;
		},

		/**
		 * Function call for set select country
		 * @memberof:adnoc.vi.vehicleinspection.modone.controller.CreateCustomer
		 * @version: 1.0.0
		 * @since:  20.05.2025
		 * @fires: onSelectcountry
		 * @author: Alka Srivastava
		 */
		onSelectcountry: function (oEvent) {
			const oSelectedRow = oEvent.getParameter("selectedRow");
			const oInput = oEvent.getSource();
			const oBindingInfo = oInput.getBindingInfo("suggestionRows");
			const sModelName = oBindingInfo.model;
			const oSelectedModel = oSelectedRow.getBindingContext(sModelName).getObject();
			const oValueBindingInfo = oInput.getBindingInfo("value");
			const oBindedModelName = oValueBindingInfo.parts[0].model;
			let oMainModel = this.getView().getModel(oBindedModelName);
			let newVehicleData = JSON.parse(JSON.stringify(oMainModel.getProperty("/NewVehicleDetails")));
			newVehicleData.country = oSelectedModel.countryNameEnglish;
			newVehicleData.countryCode = oSelectedModel.countryCode;
			oMainModel.setProperty('/NewVehicleDetails', newVehicleData);
			return false;
		},

		/**
		 * Function call for set selectmanufacturer
		 * @memberof: adnoc.vi.vehicleinspection.modone.controller.CreateCustomer
		 * @version: 1.0.0
		 * @since:  20.05.2025
		 * @fires: onSelectmanufacturer
		 * @author: Alka Srivastava
		 */
		onSelectmanufacturer: function (oEvent) {
			const oSelectedRow = oEvent.getParameter("selectedRow");
			const oInput = oEvent.getSource();
			const oBindingInfo = oInput.getBindingInfo("suggestionRows");
			const sModelName = oBindingInfo.model;
			const oSelectedModel = oSelectedRow.getBindingContext(sModelName).getObject();
			const oValueBindingInfo = oInput.getBindingInfo("value");
			const oBindedModelName = oValueBindingInfo.parts[0].model;
			let oMainModel = this.getView().getModel(oBindedModelName);
			let newVehicleData = JSON.parse(JSON.stringify(oMainModel.getProperty("/NewVehicleDetails")));
			newVehicleData.manfacturerEnglish = oSelectedModel.manufacture.manufacturerEnglish;
			newVehicleData.manfacturerArabic = oSelectedModel.manufacture.manufacturerArabic;
			newVehicleData.manfacturerCode = oSelectedModel.manufacture.makeCode;
			oMainModel.setProperty('/NewVehicleDetails', newVehicleData);
			oCflFilterObject = "&$filter=manufacture_makeCode eq " + oSelectedModel.manufacture_makeCode;
			const oModelInput = this.byId("modelIdST"); // model field ID
			if (oModelInput && oModelInput.getBinding("suggestionRows")) {
				let oFilter = new sap.ui.model.Filter("manufacture_makeCode", "EQ", oSelectedModel.manufacture.makeCode);
				oModelInput.getBinding("suggestionRows").filter([oFilter]);
			}
			return false;
		},

		/**
		 * Function call for set selectmodel
		 * @memberof:adnoc.vi.vehicleinspection.modone.controller.CreateCustomer
		 * @version: 1.0.0
		 * @since:  20.05.2025
		 * @fires: onSelectmodel
		 * @author: Alka Srivastava
		 */
		onSelectmodel: function (oEvent) {
			const oSelectedRow = oEvent.getParameter("selectedRow");
			const oInput = oEvent.getSource();
			const oBindingInfo = oInput.getBindingInfo("suggestionRows");
			const sModelName = oBindingInfo.model;
			const oSelectedModel = oSelectedRow.getBindingContext(sModelName).getObject();
			const oValueBindingInfo = oInput.getBindingInfo("value");
			const oBindedModelName = oValueBindingInfo.parts[0].model;
			let oMainModel = this.getView().getModel(oBindedModelName);
			let newVehicleData = JSON.parse(JSON.stringify(oMainModel.getProperty("/NewVehicleDetails")));
			newVehicleData.modelEnglish = oSelectedModel.model.modelNameEnglish;
			newVehicleData.modelCode = oSelectedModel.model.modelCode;
			newVehicleData.modelArabic = oSelectedModel.model.modelNameArabic;
			oMainModel.setProperty('/NewVehicleDetails', newVehicleData);
			oCflFilterObject = oCflFilterObject + " and model_modelCode eq " + oSelectedModel.model.modelCode
			const oModelInput = this.byId("platekindST"); // model field ID
			if (oModelInput && oModelInput.getBinding("suggestionRows")) {
				let oFilter = new sap.ui.model.Filter("model_modelCode", "EQ", oSelectedModel.model.modelCode);
				oModelInput.getBinding("suggestionRows").filter([oFilter]);
			}
			return false;
		},

		/**
		 * Function call for set selectkind
		 * @memberof: adnoc.vi.vehicleinspection.modone.controller.CreateCustomer
		 * @version: 1.0.0
		 * @since: 20.05.2025
		 * @fires: onSelectkind
		 * @author: Alka Srivastava
		 */
		onSelectkind: function (oEvent) {
			const oSelectedRow = oEvent.getParameter("selectedRow");
			const oInput = oEvent.getSource();
			const oBindingInfo = oInput.getBindingInfo("suggestionRows");
			const sModelName = oBindingInfo.model;
			const oSelectedModel = oSelectedRow.getBindingContext(sModelName).getObject();
			const oValueBindingInfo = oInput.getBindingInfo("value");
			const oBindedModelName = oValueBindingInfo.parts[0].model;
			let oMainModel = this.getView().getModel(oBindedModelName);
			let newVehicleData = JSON.parse(JSON.stringify(oMainModel.getProperty("/NewVehicleDetails")));
			newVehicleData.kindEnglish = oSelectedModel.vehicleKind.kindNameEnglish;
			newVehicleData.kindCode = oSelectedModel.vehicleKind.kindCode;
			newVehicleData.kindArabic = oSelectedModel.vehicleKind.kindNameArabic;
			oMainModel.setProperty('/NewVehicleDetails', newVehicleData);
			oCflFilterObject = oCflFilterObject + " and vehicleKind_kindCode eq " + oSelectedModel.vehicleKind.kindCode
			const oModelInput = this.byId("typeST"); // model field ID
			if (oModelInput && oModelInput.getBinding("suggestionRows")) {
				let oFilter = new sap.ui.model.Filter("vehicleKind_kindCode", "EQ", oSelectedModel.vehicleKind.kindCode);
				oModelInput.getBinding("suggestionRows").filter([oFilter]);
			}
			return false;
		},

		/**
		 * Function call for set selectplatetype
		 * @memberof: adnoc.vi.vehicleinspection.modone.controller.CreateCustomer
		 * @version: 1.0.0
		 * @since: 20.05.2025
		 * @fires: onSelectplatetype
		 * @author: Alka Srivastava
		 */
		onSelectplatetype: function (oEvent) {
			const oSelectedRow = oEvent.getParameter("selectedRow");
			const oInput = oEvent.getSource();
			const oBindingInfo = oInput.getBindingInfo("suggestionRows");
			const sModelName = oBindingInfo.model;
			const oSelectedModel = oSelectedRow.getBindingContext(sModelName).getObject();
			const oValueBindingInfo = oInput.getBindingInfo("value");
			const oBindedModelName = oValueBindingInfo.parts[0].model;
			let oMainModel = this.getView().getModel(oBindedModelName);
			let newVehicleData = JSON.parse(JSON.stringify(oMainModel.getProperty("/NewVehicleDetails")));
			newVehicleData.plateTypeEnglish = oSelectedModel.typeNameEnglish;
			newVehicleData.plateTypeCode = oSelectedModel.typeCode;
			newVehicleData.plateTypeArabic = oSelectedModel.typeNameArabic;
			oMainModel.setProperty('/NewVehicleDetails', newVehicleData);
			return false;
		},

		/**
		 * Function call for set selecttype
		 * @memberof: adnoc.vi.vehicleinspection.modone.controller.CreateCustomer
		 * @version: 1.0.0
		 * @since:  20.05.2025
		 * @fires: onSelecttype
		 * @author: Alka Srivastava
		 */
		onSelecttype: function (oEvent) {
			const oSelectedRow = oEvent.getParameter("selectedRow");
			const oInput = oEvent.getSource();
			const oBindingInfo = oInput.getBindingInfo("suggestionRows");
			const sModelName = oBindingInfo.model;
			const oSelectedModel = oSelectedRow.getBindingContext(sModelName).getObject();
			const oValueBindingInfo = oInput.getBindingInfo("value");
			const oBindedModelName = oValueBindingInfo.parts[0].model;
			let oMainModel = this.getView().getModel(oBindedModelName);
			let newVehicleData = JSON.parse(JSON.stringify(oMainModel.getProperty("/NewVehicleDetails")));
			newVehicleData.typeEnglish = oSelectedModel.vehicleType.typeNameEnglish;
			newVehicleData.typeCode = oSelectedModel.vehicleType.typeCode;
			newVehicleData.typeArabic = oSelectedModel.vehicleType.typeNameArabic;
			oMainModel.setProperty('/NewVehicleDetails', newVehicleData);
			return false;
		},

		/**
		 * Function call for set selectgear
		 * @memberof:adnoc.vi.vehicleinspection.modone.controller.CreateCustomer
		 * @version: 1.0.0
		 * @since: 20.05.2025
		 * @fires: onSelectgear
		 * @author: Alka Srivastava
		 */
		onSelectgear: function (oEvent) {
			const oSelectedRow = oEvent.getParameter("selectedRow");
			const oInput = oEvent.getSource();
			const oBindingInfo = oInput.getBindingInfo("suggestionRows");
			const sModelName = oBindingInfo.model;
			const oSelectedModel = oSelectedRow.getBindingContext(sModelName).getObject();
			const oValueBindingInfo = oInput.getBindingInfo("value");
			const oBindedModelName = oValueBindingInfo.parts[0].model;
			let oMainModel = this.getView().getModel(oBindedModelName);
			let newVehicleData = JSON.parse(JSON.stringify(oMainModel.getProperty("/NewVehicleDetails")));
			newVehicleData.gearTypeEnglish = oSelectedModel.codeDescEnglish;
			newVehicleData.gearTypeCode = oSelectedModel.codeId;
			newVehicleData.gearTypeArabic = oSelectedModel.codeDescArabic;
			oMainModel.setProperty('/NewVehicleDetails', newVehicleData);
			return false;
		},

		/**
		 * Function call for set selectfuel
		 * @memberof:adnoc.vi.vehicleinspection.modone.controller.CreateCustomer
		 * @version: 1.0.0
		 * @since: 20.05.2025
		 * @fires: onSelectfuel
		 * @author: Alka Srivastava
		 */
		onSelectfuel: function (oEvent) {
			const oSelectedRow = oEvent.getParameter("selectedRow");
			const oInput = oEvent.getSource();
			const oBindingInfo = oInput.getBindingInfo("suggestionRows");
			const sModelName = oBindingInfo.model;
			const oSelectedModel = oSelectedRow.getBindingContext(sModelName).getObject();
			const oValueBindingInfo = oInput.getBindingInfo("value");
			const oBindedModelName = oValueBindingInfo.parts[0].model;
			let oMainModel = this.getView().getModel(oBindedModelName);
			let newVehicleData = JSON.parse(JSON.stringify(oMainModel.getProperty("/NewVehicleDetails")));
			newVehicleData.fuelTypeEnglish = oSelectedModel.codeDescEnglish;
			newVehicleData.fuelTypeCode = oSelectedModel.codeId;
			newVehicleData.fuelTypeArabic = oSelectedModel.codeDescArabic;
			oMainModel.setProperty('/NewVehicleDetails', newVehicleData);
			return false;
		},

		/**
		 * Function call for set selectsteering
		 * @memberof: adnoc.vi.vehicleinspection.modone.controller.CreateCustomer
		 * @version: 1.0.0
		 * @since:  20.05.2025
		 * @fires: onSelectsteering
		 * @author: Alka Srivastava
		 */
		onSelectsteering: function (oEvent) {
			const oSelectedRow = oEvent.getParameter("selectedRow");
			const oInput = oEvent.getSource();
			const oBindingInfo = oInput.getBindingInfo("suggestionRows");
			const sModelName = oBindingInfo.model;
			const oSelectedModel = oSelectedRow.getBindingContext(sModelName).getObject();
			const oValueBindingInfo = oInput.getBindingInfo("value");
			const oBindedModelName = oValueBindingInfo.parts[0].model;
			let oMainModel = this.getView().getModel(oBindedModelName);
			let newVehicleData = JSON.parse(JSON.stringify(oMainModel.getProperty("/NewVehicleDetails")));
			newVehicleData.steeringSideEnglish = oSelectedModel.englishName;
			newVehicleData.steeringSideCode = oSelectedModel.steeringCode;
			newVehicleData.steeringSideArabic = oSelectedModel.arabicName;
			oMainModel.setProperty('/NewVehicleDetails', newVehicleData);
			return false;
		},

		/**
		 * Function call for set select weight
		 * @memberof: adnoc.vi.vehicleinspection.modone.controller.CreateCustomer
		 * @version: 1.0.0
		 * @since:  20.05.2025
		 * @fires: onSelectweight
		 * @author: Alka Srivastava
		 */
		onSelectweight: function (oEvent) {
			const oSelectedRow = oEvent.getParameter("selectedRow");
			const oInput = oEvent.getSource();
			const oBindingInfo = oInput.getBindingInfo("suggestionRows");
			const sModelName = oBindingInfo.model;
			const oSelectedModel = oSelectedRow.getBindingContext(sModelName).getObject();
			const oValueBindingInfo = oInput.getBindingInfo("value");
			const oBindedModelName = oValueBindingInfo.parts[0].model;
			let oMainModel = this.getView().getModel(oBindedModelName);
			let newVehicleData = JSON.parse(JSON.stringify(oMainModel.getProperty("/NewVehicleDetails")));
			newVehicleData.weightDiscEnglish = oSelectedModel.codeDescEnglish;
			newVehicleData.weightDiscCode = oSelectedModel.weightKindCode;
			newVehicleData.weightDiscArabic = oSelectedModel.codeDescArabic;
			oMainModel.setProperty('/NewVehicleDetails', newVehicleData);
			return false;
		},

		/**
		 * Function call for set select gear
		 * @memberof:adnoc.vi.vehicleinspection.modone.controller.CreateCustomer
		 * @version: 1.0.0
		 * @since:  20.05.2025
		 * @fires: onSelectregcar
		 * @author: Alka Srivastava
		 */
		onSelectregcar: function (oEvent) {
			const oSelectedRow = oEvent.getParameter("selectedRow");
			const oInput = oEvent.getSource();
			const oBindingInfo = oInput.getBindingInfo("suggestionRows");
			const sModelName = oBindingInfo.model;
			const oSelectedModel = oSelectedRow.getBindingContext(sModelName).getObject();
			const oValueBindingInfo = oInput.getBindingInfo("value");
			const oBindedModelName = oValueBindingInfo.parts[0].model;
			let oMainModel = this.getView().getModel(oBindedModelName);
			let newVehicleData = JSON.parse(JSON.stringify(oMainModel.getProperty("/NewVehicleDetails")));
			newVehicleData.regCarRemarkEnglish = oSelectedModel.englishName;
			newVehicleData.regCarRemarkCode = oSelectedModel.steeringCode;
			newVehicleData.regCarRemarkArabic = oSelectedModel.arabicName;
			oMainModel.setProperty('/NewVehicleDetails', newVehicleData);
			return false;
		},

		/**
		 * Function call for set selectlostplate
		 * @memberof:adnoc.vi.vehicleinspection.modone.controller.CreateCustomer
		 * @version: 1.0.0
		 * @since:  20.05.2025
		 * @fires: onSelectlostplate
		 * @author: Alka Srivastava
		 */
		onSelectlostplate: function (oEvent) {
			const oSelectedRow = oEvent.getParameter("selectedRow");
			const oInput = oEvent.getSource();
			const oBindingInfo = oInput.getBindingInfo("suggestionRows");
			const sModelName = oBindingInfo.model;
			const oSelectedModel = oSelectedRow.getBindingContext(sModelName).getObject();
			const oValueBindingInfo = oInput.getBindingInfo("value");
			const oBindedModelName = oValueBindingInfo.parts[0].model;
			let oMainModel = this.getView().getModel(oBindedModelName);
			let newVehicleData = JSON.parse(JSON.stringify(oMainModel.getProperty("/NewVehicleDetails")));
			newVehicleData.lostPlateEnglish = oSelectedModel.codeDescEnglish;
			newVehicleData.lostPlateCode = oSelectedModel.codeId;
			newVehicleData.lostPlateArabic = oSelectedModel.codeDescArabic;
			oMainModel.setProperty('/NewVehicleDetails', newVehicleData);
			return false;
		},

		/**
		 * Function call for set select damage plate
		 * @memberof:adnoc.vi.vehicleinspection.modone.controller.CreateCustomer
		 * @version: 1.0.0
		 * @since: 20.05.2025
		 * @fires: onSelectdamageplate
		 * @author: Alka Srivastava
		 */
		onSelectdamageplate: function (oEvent) {
			const oSelectedRow = oEvent.getParameter("selectedRow");
			const oInput = oEvent.getSource();
			const oBindingInfo = oInput.getBindingInfo("suggestionRows");
			const sModelName = oBindingInfo.model;
			const oSelectedModel = oSelectedRow.getBindingContext(sModelName).getObject();
			const oValueBindingInfo = oInput.getBindingInfo("value");
			const oBindedModelName = oValueBindingInfo.parts[0].model;
			let oMainModel = this.getView().getModel(oBindedModelName);
			let newVehicleData = JSON.parse(JSON.stringify(oMainModel.getProperty("/NewVehicleDetails")));
			newVehicleData.damagePlateEnglish = oSelectedModel.codeDescEnglish;
			newVehicleData.damagePlateCode = oSelectedModel.codeId;
			newVehicleData.damagePlateArabic = oSelectedModel.codeDescArabic;
			oMainModel.setProperty('/NewVehicleDetails', newVehicleData);
			return false;
		},

		/**
		 * Function call for set selectmilage
		 * @memberof:adnoc.vi.vehicleinspection.modone.controller.CreateCustomer
		 * @version: 1.0.0
		 * @since:  20.05.2025
		 * @fires: onSelectmilage
		 * @author: Alka Srivastava
		 */
		onSelectmilage: function (oEvent) {
			const oSelectedRow = oEvent.getParameter("selectedRow");
			const oInput = oEvent.getSource();
			const oBindingInfo = oInput.getBindingInfo("suggestionRows");
			const sModelName = oBindingInfo.model;
			const oSelectedModel = oSelectedRow.getBindingContext(sModelName).getObject();
			const oValueBindingInfo = oInput.getBindingInfo("value");
			const oBindedModelName = oValueBindingInfo.parts[0].model;
			let oMainModel = this.getView().getModel(oBindedModelName);
			let newVehicleData = JSON.parse(JSON.stringify(oMainModel.getProperty("/NewVehicleDetails")));
			newVehicleData.mileageMtrEnglish = oSelectedModel.codeDescEnglish;
			newVehicleData.mileageCode = oSelectedModel.codeId;
			newVehicleData.mileageMtrArabic = oSelectedModel.codeDescArabic;
			oMainModel.setProperty('/NewVehicleDetails', newVehicleData);
			return false;
		},

		/**
		 * Function call for set mileage change
		 * @memberof:adnoc.vi.vehicleinspection.modone.controller.CreateCustomer
		 * @version: 1.0.0
		 * @since: 20.05.2025
		 * @fires: onMileageChange
		 * @author: Alka Srivastava
		 */
		onMileageChange: function (oEvent) {
			let oStepInput = oEvent.getSource();
			let oModel = this.getView().getModel("SericeTestModel");
			let oNewMileage = oStepInput.getValue();
			let oOldMileage = oModel.getProperty("/NewVehicleDetails/mileage");
			let originalMileage = oModel.getProperty("/VehicleDetails/mileage");
			if (oNewMileage < originalMileage) {
				oStepInput.setValue(originalMileage);
				sap.m.MessageToast.show(oBundle.getText("vehInfo_mileage"));

			}
		},

		// For Change Info End - Alka 

		//#endregion

		//#region TrafficRegion

		/**
		* Get Traffic Test Status, is tis Passed or Fail
		* @memberof adnoc.vi.vehicleinspection.modone.controller.ServiceTest
		* @version 1.0.0
		* @since 10.02.2025
		* @fires getTrafficTestStatus
		* @author MM
		*/

		getTrafficTestStatus: function () {
			const oStatusModel = this.getView().getModel('lUpdateModelServiceTestModel');
			const oStatusData = oStatusModel.getData();
			let sTrafficVehicleGUID = '';
			let sTrafficVehicle = [];
			const aFilteredTrafficRes = this.charStatusData?.vehOrdInspLinesTestChars?.results?.filter(
				item => item.applicableTestName === Constant.TESTTYPE.TRAFFIC
			);

			if (!aFilteredTrafficRes || aFilteredTrafficRes.length === 0) {
				return null;
			}

			sTrafficVehicle = aFilteredTrafficRes.map(item => ({
				testUUID: item.VehicleOrderInspectionLinesTestCharUUID,
				testStatus: item.testStatus,
				applicableTestName: item.applicableTestName
			}));

			sTrafficVehicleGUID = sTrafficVehicle[0]?.testUUID;

			const aMatchingTrafficItems = oStatusData.results
				.flatMap(result => result.vehOrdInspLinesTestChars.results)
				.filter(item => item.VehicleOrderInspectionLinesTestCharUUID === sTrafficVehicleGUID);

			return aMatchingTrafficItems[0];
		},

		/**
		* Open Traffic Fragment to Bind Traffic data also
		* @memberof adnoc.vi.vehicleinspection.modone.controller.ServiceTest
		* @version 1.0.0
		* @since 10.02.2025
		* @fires onBtnPressTrafficTest,onBtnPressGetAttachmentData,getTrafficTestDataAfterSave,getTrafficTestMasterData
		* @author MM
		*/


		onBtnPressTrafficTest: async function () {

			let oMatchingItems = this.getTrafficTestStatus();
			let sTestStatus = oMatchingItems !== null ? oMatchingItems.testStatus : null;

			let oCommentModel = new sap.ui.model.json.JSONModel({
				testComments: null
			});

			this.getView().setModel(oCommentModel, "trafficCommentModel");
			//await this.onBtnPressGetAttachmentData();
			if (!this._oDialog && oMatchingItems != null) {

				this._oDialog = sap.ui.xmlfragment(
					"trafficTestDialog",
					"adnoc.vi.vehicleinspection.modone.fragment.view.TrafficTest_V2",
					this
				);
				this.getView().addDependent(this._oDialog);

			}

			if (sTestStatus === Constant.STATUS.INPROGRESS || sTestStatus === Constant.STATUS.PASS || sTestStatus === Constant.STATUS.FAIL) {
				await this.getTrafficTestDataAfterSave();
				oCommentModel.setProperty("/testComments", sTrafficComment);
			}

			if (sTestStatus === null) {
				MessageBox.warning(this.oBundle.getText("traffic_MessageBoxForTrafficnotApplicable"));
				return
			}

			if (sTestStatus === Constant.STATUS.OPEN) {
				let oModel = new sap.ui.model.json.JSONModel({}); // or actual fresh data
				this.getView().setModel(oModel, "TrafficSaveModel");
				this.getView().setModel(oModel, "ButtonVisibleModel");
				await this.getTrafficTestMasterData();

			}

			this._oDialog.open();
		},

		onBtnPressTrafficTest_V2: async function () {

			
			//await this.onBtnPressGetAttachmentData();
			
				this._oDialog = sap.ui.xmlfragment(
					"trafficTestDialog_V2",
					"adnoc.vi.vehicleinspection.modone.fragment.view.TrafficTest_V2",
					this
				);
				this.getView().addDependent(this._oDialog);

			this._oDialog.open();
		},


		/**
		* Close Traffic Dialog
		* @memberof adnoc.vi.vehicleinspection.modone.controller.ServiceTest
		* @version 1.0.0
		* @since 10.02.2025
		* @fires onBtnPressCloseTraffic
		* @author MM
		*/

		onBtnPressCloseTraffic: function () {
			if (this._oDialog) {
				this._oDialog.close();
			}
		},

		/**
		* Get Traffic Data from Traffic Master API
		* @memberof adnoc.vi.vehicleinspection.modone.controller.ServiceTest
		* @version 1.0.0
		* @since 10.02.2025
		* @fires getTrafficTestMasterData
		* @author MM
		*/

		getTrafficTestMasterData: async function () {
			await this.createNewModelUsingAPI(
				"POST",
				`odata/v2/vehicleinspection/fetchTrafficData`
				,
				"",
				"TrafficMasterModel"
			);
			const oTrafficRes = this.getView().getModel("TrafficMasterModel");
			let oTrafficData = oTrafficRes.getData().d.fetchTrafficData.aResponseArray;
			this.createTreeTable(oTrafficData);

		},

		/**
		* Get Traffic Data after save and when re open Fragment
		* @memberof adnoc.vi.vehicleinspection.modone.controller.ServiceTest
		* @version 1.0.0
		* @since 10.02.2025
		* @fires getTrafficTestDataAfterSave,createTreeTable
		* @author MM
		*/

		getTrafficTestDataAfterSave: async function () {

			let aMatchingItems = this.getTrafficTestStatus();
			let sTrafficCharUUID = aMatchingItems.VehicleOrderInspectionLinesTestCharUUID;
			let sTrafficStatus = aMatchingItems.testStatus;

			let body = {
				"VehicleOrderInspectionLinesTestCharUUID": sTrafficCharUUID
			}

			await this.createNewModelUsingAPI(
				"POST",
				`odata/v2/vehicleinspection/getTestResultTrafficById`,
				body,
				"TrafficAfterSaveModel"
			);
			const oTrafficResAfterSave = this.getView().getModel("TrafficAfterSaveModel");
			let oTrafficData = oTrafficResAfterSave.getData().d.results;

			this.createTreeTable(oTrafficData);

			if (sTrafficStatus === Constant.STATUS.PASS || sTrafficStatus === Constant.STATUS.FAIL) {
				var oModel = new sap.ui.model.json.JSONModel({
					isButtonVisible: false,
					isControlEditable: false,
				});

			} else {
				var oModel = new sap.ui.model.json.JSONModel({
					isButtonVisible: true,
					isControlEditable: true,
				});
			}

			this.getView().setModel(oModel, "ButtonVisibleModel");

		},

		/**
		* Creating Tree Table in Traffic test
		* @memberof adnoc.vi.vehicleinspection.modone.controller.ServiceTest
		* @version 1.0.0
		* @since 10.02.2025
		* @fires createTreeTable
		* @author MM
		*/

		createTreeTable: function (resData) {
			let sTreeMatchingItems = this.getTrafficTestStatus();
			let sTreeStatus = sTreeMatchingItems.testStatus;
			let aFormattedData = [];

			resData.forEach((mainItem, mainIndex) => {
				// Parent Node (Main Category)
				let oParent = {
					id: "parent_" + mainIndex,
					testMainTypeTextEnglish: mainItem.testMainTypeTextEnglish,
					testMainTypeTextArabic: mainItem.testMainTypeTextArabic,
					testMainTypeNo: mainItem.testMainTypeNo,
					isParent: true,
					headerTypeValueLabel1: mainItem.headerTypeValueLabel1,
					headerTypeValueLabel2: mainItem.headerTypeValueLabel2,
					headerTypeValueLabel3: mainItem.headerTypeValueLabel3,
					headerTypeValueLabel4: mainItem.headerTypeValueLabel4,
					children: []

				};

				// Child Nodes (SubCategories)
				mainItem.SubCategory.forEach((subItem, subIndex) => {
					let oChild = {
						id: "child_" + mainIndex + "_" + subIndex,
						testMainTypeTextEnglish: subItem.testSubTypeTextEnglish.replace(/\n/g, " "),
						testMainTypeTextArabic: subItem.testSubTypeTextArabic.replace(/\n/g, " "),
						isParent: false
					};
					if (sTreeStatus !== 'OPEN') {
						oChild.controlTypeValueLabel1 = subItem.controlTypeValueLabel1;
						oChild.controlTypeValueLabel2 = subItem.controlTypeValueLabel2;
						oChild.controlTypeValueLabel3 = subItem.controlTypeValueLabel3;
						oChild.controlTypeValueLabel4 = subItem.controlTypeValueLabel4;
					}
					oParent.children.push(oChild);

				});

				aFormattedData.push(oParent);
			});


			// Create JSON Model & set it
			let oModel = new JSONModel({ responseArray: aFormattedData });
			this.getView().setModel(oModel, "treeModel");

		},

		/**
		* Radio Selection for Traffic Table in Traffic test
		* @memberof adnoc.vi.vehicleinspection.modone.controller.ServiceTest
		* @version 1.0.0
		* @since 10.02.2025
		* @fires onRadioSelectTrafficTest
		* @author MM
		*/

		onRadioSelectTrafficTest: function (oEvent) {
			const oRadioButton = oEvent.getSource();
			const oContext = oRadioButton.getBindingContext("treeModel");

			if (!oContext) return;

			const oModel = oContext.getModel();
			const sPath = oContext.getPath();

			const sSelectedProp = oRadioButton.getCustomData().find(cd => cd.getKey() === "prop").getValue();
			let sOppositeProp = "";

			// Decide the opposite property
			switch (sSelectedProp) {
				case "controlTypeValueLabel3":
					sOppositeProp = "controlTypeValueLabel4";
					break;
				case "controlTypeValueLabel4":
					sOppositeProp = "controlTypeValueLabel3";
					break;
				case "controlTypeValueLabel1":
					sOppositeProp = "controlTypeValueLabel2";
					break;
				case "controlTypeValueLabel2":
					sOppositeProp = "controlTypeValueLabel1";
					break;
				default:
					console.warn("Unknown selected prop:", sSelectedProp);
					return;
			}

			// Set selected one to 'YES'
			oModel.setProperty(`${sPath}/${sSelectedProp}`, "YES");
			oModel.setProperty(`${sPath}/${sOppositeProp}`, "NO");
		},

		/**
		* Generate Common Payload for Traffic test Saving & Patch
		* @memberof adnoc.vi.vehicleinspection.modone.controller.ServiceTest
		* @version 1.0.0
		* @since 10.02.2025
		* @fires generateTrafficResultPayload
		* @author MM
		*/

		generateTrafficResultPayload: async function (aTreeData) {
			let oResAttachModel = this.getView().getModel("TrafficResAttachmentModel").getData().d.results;
			let oFileUploadModel = this.getView().getModel("FileUploadedModel").getData();
			const oPayload = [];
			let dCurrentDate = new Date();

			let dFormattedDate = Formatter.getDateFromatIn_yyyyMMdd_HH_MM_SS(dCurrentDate);
			let [datePart, timePart] = dFormattedDate.split(" ");

			aTreeData.forEach(oParent => {
				const sMainTypeTextArabic = oParent.testMainTypeTextArabic;
				const sMainTypeTextEnglish = oParent.testMainTypeTextEnglish;
				const stestMainTypeNo = oParent.testMainTypeNo;

				oParent.children.forEach((oChild, index) => {
					const aItem = {
						testMainTypeSrNo: index + 1,
						testMainTypeNo: stestMainTypeNo,
						testMainTypeTextEnglish: sMainTypeTextEnglish,
						testMainTypeTextArabic: sMainTypeTextArabic,
						testSubTypeTextEnglish: oChild.testMainTypeTextEnglish,
						testSubTypeTextArabic: oChild.testMainTypeTextArabic,
						controlTypeValueLabel1Flag: oChild.controlTypeValueLabel1 === 'YES' ? true : false,
						controlTypeValueLabel2Flag: oChild.controlTypeValueLabel2 === 'YES' ? true : false,
						controlTypeValueLabel3Flag: oChild.controlTypeValueLabel3 === 'YES' ? true : false,
						controlTypeValueLabel4Flag: oChild.controlTypeValueLabel4 === 'YES' ? true : false
					};

					oPayload.push(aItem);
				});
			});

			let aRawPreviousData = this.getView().getModel('AttachResponseModel').getData().d.testResTrafficAttachs.results;

			let oResPreviousAttachModel = aRawPreviousData.map((item, index) => ({
				testMainTypeSrNo: item.testMainTypeSrNo || index + 1,
				testMainTypeNo: item.testMainTypeNo,
				testMainTypeTextEnglish: item.testMainTypeTextEnglish,
				testMainTypeTextArabic: item.testMainTypeTextArabic,
				uploadedDate: Formatter.convertToYYYYMMDD_String(item.uploadedDate), // make sure format matches if needed
				uploadedTime: item.uploadedTime, // format to 24hr if needed
				DisplayName: item.DisplayName,
				attachmentGuId_attachmentGuId: item.attachmentGuId_attachmentGuId
			}));

			// Start fresh array with previous attachments
			let oPayloadAttachFiles = [...oResPreviousAttachModel];
			let iSrNo = oResPreviousAttachModel.length + 1;
			// Now add only NEW attachments not already in previous response

			oFileUploadModel.FileCategory.forEach((oCategory) => {
				const sMainTypeTextEnglish = oCategory.CategoryName;
				const sMainTypeTextArabic = oCategory.CategoryNameArabic;
				const sMainTypeNo = oCategory.CategoryTypeNo;
				if (Array.isArray(oCategory.Files) && oCategory.Files.length > 0) {

					oCategory.Files.forEach((oFile) => {
						// Check if already exists
						// const isAlreadyPresent = oResPreviousAttachModel.some(existing =>
						// 	existing.DisplayName === oFile.attachmentName
						// );

						// if (!isAlreadyPresent) {
						const matchedAttachment = oResAttachModel.find(
							(item) => item.attachmentName === oFile.attachmentName
						);

						if (matchedAttachment) {
							const aAttachItem = {
								testMainTypeSrNo: iSrNo++,
								testMainTypeNo: sMainTypeNo,
								testMainTypeTextEnglish: sMainTypeTextEnglish,
								testMainTypeTextArabic: sMainTypeTextArabic,
								uploadedDate: datePart,
								uploadedTime: timePart,
								DisplayName: oFile.attachmentName,
								attachmentGuId_attachmentGuId: matchedAttachment.attachmentGuId
							};
							oPayloadAttachFiles.push(aAttachItem);
						}
						//}
					});
				}

			});

			const finalPayload = {
				applicableTestName: null,
				testComments: null,
				testInspectedBy: null,
				testInspectionEndDate: null,
				testInspectionStartDate: null,
				testStatus: null,
				testResultsTraffics: oPayload,
				testResTrafficAttachs: oPayloadAttachFiles,

			};
			return finalPayload;
		},

		/**
		* Generate Common Payload for Traffic test Saving & Patch
		* @memberof adnoc.vi.vehicleinspection.modone.controller.ServiceTest
		* @version 1.0.0
		* @since 10.02.2025
		* @fires onBtnPressSaveTrafficTest,getTrafficTestStatus,onBtnPressSaveTrafficAttachment,generateTrafficResultPayload,updateServiceTestModel,onBtnPressCloseTraffic,onBtnPressClearFragmentAfterSave,patchAttachmentDataTraffic
		* @author MM
		*/

		onBtnPressSaveTrafficTest: async function (oEvent) {

			let sVehicleStatus = this.getTrafficTestStatus();

			let oReqModel = this.getView().getModel("treeModel").getData().responseArray;
			let oCommentModel = this.getView().getModel("trafficCommentModel").getData();

			if (sVehicleStatus.testStatus === Constant.STATUS.OPEN) {
				let isValidationFailed = await this.onValidateAttachedFile();
				if (isValidationFailed) {
					return;
				}
			}

			await this.onBtnPressSaveTrafficAttachment();

			const aRequestPayload = await this.generateTrafficResultPayload(oReqModel);

			let sTrafficVehicleGUID = '';
			let dCurrentDate = new Date();
			let dFormattedDate = Formatter.getDateFromatIn_yyyyMMdd_HH_MM_SS(dCurrentDate);

			let oButton = oEvent.getSource();

			let fullId = oButton.getId();
			buttonId = fullId.split("--").pop();

			if (this.charStatusData && this.charStatusData.vehOrdInspLinesTestChars) {
				let aTrafficCharStatus = this.charStatusData;

				const aTrafficfilteredResults = aTrafficCharStatus.vehOrdInspLinesTestChars.results.filter(item => item.applicableTestName === Constant.TESTTYPE.TRAFFIC);
				const sTrafficVehicleOrderGuid = aTrafficfilteredResults.filter(item => item.applicableTestName === Constant.TESTTYPE.TRAFFIC)
					.map(item => ({
						testUUID: item.VehicleOrderInspectionLinesTestCharUUID,
						testStatus: item.testStatus,
						applicableTestName: item.applicableTestName
					}));

				if (sTrafficVehicleOrderGuid.length === 0) {
					return;
				}

				sTrafficVehicleGUID = sTrafficVehicleOrderGuid[0].testUUID;
				aRequestPayload.applicableTestName = sTrafficVehicleOrderGuid[0].applicableTestName;
				aRequestPayload.testInspectedBy = sTestInspectedUserName;
				aRequestPayload.testComments = oCommentModel.testComments;
				aRequestPayload.testInspectionStartDate = dFormattedDate;
				aRequestPayload.testInspectionEndDate = dFormattedDate;

				let sTrafficStatusSave = aRequestPayload.testResultsTraffics.every(item => item.controlTypeValueLabel4Flag === true) ? Constant.STATUS.PASS : Constant.STATUS.FAIL;

				if ((sTrafficVehicleOrderGuid[0].testStatus === Constant.STATUS.OPEN || sTrafficVehicleOrderGuid[0].testStatus === Constant.STATUS.INPROGRESS) && buttonId !== Constant.BUTTONEVENT.BUTTONTRAFFICID) {
					aRequestPayload.testStatus = Constant.STATUS.INPROGRESS
				} else if ((sTrafficVehicleOrderGuid[0].testStatus === Constant.STATUS.OPEN || sTrafficVehicleOrderGuid[0].testStatus === Constant.STATUS.INPROGRESS) && buttonId === Constant.BUTTONEVENT.BUTTONTRAFFICID) {
					aRequestPayload.testStatus = sTrafficStatusSave;
				} else {
					aRequestPayload.testStatus = sTrafficVehicleOrderGuid[0].testStatus;
				}

			}
			else {
				console.log("charStatusData or vehOrdInspLinesTestChars is undefined.");
			}
			console.log(aRequestPayload);
			await this.deleteTrafficTestData(aRequestPayload, sTrafficVehicleGUID);
			await this.createNewModelUsingAPI(
				'PATCH',
				`odata/v2/vehicleinspection/VehicleOrderInspectionLinesTestChar('${sTrafficVehicleGUID}')`,
				aRequestPayload,
				'TrafficSaveModel'
			);

			let oTrafficSaveModel = this.getView().getModel('TrafficSaveModel');
			let oTrafficSaveData = oTrafficSaveModel.getData();
			if (oTrafficSaveData != undefined) {
				await this.patchAttachmentDataTraffic();
			}
			if (buttonId === 'ConfirmTraffic_Id') {
				MessageToast.show(this.oBundle.getText("traffic_MessageBoxForConfirm"));
			}
			else {
				MessageToast.show(this.oBundle.getText("traffic_MessageBoxForSave"));
			}
			this.updateServiceTestModel();
			this.onBtnPressCloseTraffic();
			this.onBtnPressClearFragmentAfterSave();
		},

		/**
		* Calling delete api before save traffic test
		* @memberof adnoc.vi.vehicleinspection.modone.controller.ServiceTest
		* @version 1.0.0
		* @since 10.02.2025
		* @fires deleteTrafficTestData
		* @author MM
		*/

		deleteTrafficTestData: async function (aRequestPayload, sTrafficVehicleGUID) {
			const oPayload = {
				applicableTestName: aRequestPayload.applicableTestName,
				testComments: null,
				testInspectedBy: aRequestPayload.testInspectedBy,
				testInspectionEndDate: aRequestPayload.testInspectionEndDate,
				testInspectionStartDate: aRequestPayload.testInspectionStartDate,
				testStatus: aRequestPayload.testStatus,
				testResultsTraffics: null
			};
			await this.createNewModelUsingAPI(
				'PATCH',
				`odata/v2/vehicleinspection/VehicleOrderInspectionLinesTestChar('${sTrafficVehicleGUID}')`,
				oPayload,
				'TrafficAfterDeleteModel'
			);
		},

		/**
		* Functon for Confirm calling traffic test
		* @memberof adnoc.vi.vehicleinspection.modone.controller.ServiceTest
		* @version 1.0.0
		* @since 10.02.2025
		* @fires onBtnPressConfirmTrafficTest,onBtnPressSaveTrafficTest
		* @author MM
		*/

		onBtnPressConfirmTrafficTest(oEvent) {
			let oButton = oEvent.getSource();
			let fullId = oButton.getId("ConfirmTraffic_Id");
			buttonId = fullId.split("--").pop();


			MessageBox.confirm(
				this.oBundle.getText("traffic_MessageBoxForConfirmation"), {
				icon: MessageBox.Icon.INFORMATION,
				title: "Fetching Data",
				class: "sapUiSizeCompact",
				actions: [MessageBox.Action.YES, MessageBox.Action.NO],
				onClose: function (oAction) {
					if (oAction === "YES") {
						this.onBtnPressSaveTrafficTest(oEvent);
					}
				}.bind(this)
			});
		},

		/**
		* Functon for File Uploading Functionality
		* @memberof adnoc.vi.vehicleinspection.modone.controller.ServiceTest
		* @version 1.0.0
		* @since 10.02.2025
		* @fires onBtnPressFileUpload
		* @author MM
		*/

		onBtnPressFileUpload: function (oEvent) {

			const oFileModel = this.getView().getModel("FileUploadedModel");
			const oFileData = oFileModel.getData();
			const oReqModel = this.getView().getModel("treeModel").getData().responseArray;

			// Ensure FileCategory is initialized
			if (!oFileData.FileCategory) {
				oFileData.FileCategory = [];
			}

			// Remove any categories that are blank/null
			oFileData.FileCategory = oFileData.FileCategory.filter(cat =>
				cat.CategoryName && cat.CategoryName.trim() !== ""
			);

			// Merge categories (preserve existing ones)
			oReqModel.forEach((item) => {
				let aExistingCategory = oFileData.FileCategory.find(cat =>
					cat.CategoryName === item.testMainTypeTextEnglish
				);

				if (!aExistingCategory) {
					oFileData.FileCategory.push({
						CategoryName: item.testMainTypeTextEnglish,
						CategoryNameArabic: item.testMainTypeTextArabic,
						CategoryTypeNo: item.testMainTypeNo,
						Files: []
					});
				} else {
					// Optional cleanup: remove invalid files
					aExistingCategory.Files = (aExistingCategory.Files || []).filter(file =>
						file && file.attachmentName
					);
				}
			});

			// Set refreshed data
			oFileModel.setData(oFileData);
			oFileModel.refresh(true);
			if (!this.fileUploadFlag) {
				this.fileUploadFlag = sap.ui.xmlfragment("FileUploadDialog", "adnoc.vi.vehicleinspection.modone.fragment.view.FilesUpload", this);
				this.getView().addDependent(this.fileUploadFlag);
			}

			this.fileUploadFlag.open();
		},

		/**
		* Functon for Close File Uploading Fragment
		* @memberof adnoc.vi.vehicleinspection.modone.controller.ServiceTest
		* @version 1.0.0
		* @since 10.02.2025
		* @fires onBtnPressCloseFileUpload
		* @author MM
		*/

		onBtnPressCloseFileUpload: function () {
			if (this.fileUploadFlag) {
				this.fileUploadFlag.close();
			}
		},

		/**
		* Functon for Clear File Uploading Fragment
		* @memberof adnoc.vi.vehicleinspection.modone.controller.ServiceTest
		* @version 1.0.0
		* @since 10.02.2025
		* @fires onBtnPressClearFragmentAfterSave
		* @author MM
		*/

		onBtnPressClearFragmentAfterSave: function () {
			let oFileUploadModel = this.getView().getModel("FileUploadedModel");

			if (this.fileUploadFlag) {
				this.fileUploadFlag.close();
				this.fileUploadFlag.destroy();
				this.fileUploadFlag = null;
				oFileUploadModel.setProperty("/FileCategory", []);
			}
		},

		/**
		* Functon for Save Attachment API 
		* @memberof adnoc.vi.vehicleinspection.modone.controller.ServiceTest
		* @version 1.0.0
		* @since 10.02.2025
		* @fires onBtnPressSaveTrafficAttachment
		* @author MM
		*/

		onBtnPressSaveTrafficAttachment: async function () {
			let oFileUploadModel = this.getView().getModel("FileUploadedModel").getData();
			let oFiles = []; // Final array to collect all files

			// 🛠 Loop over each Category
			oFileUploadModel.FileCategory.forEach((oCategory) => {
				// Check if Files exist inside category
				if (oCategory.Files && oCategory.Files.length) {
					oCategory.Files.forEach((oFile) => {
						if (oFile.base64File != null) {
							oFiles.push({
								"attachmentGuId": null,
								"attachmentName": oFile.attachmentName,
								"orgFileName": oFile.orgFileName,
								"orgFileExtension": oFile.orgFileExtension,
								"docType": null,
								"docId": null,
								"docGuid": null,
								"base64File": oFile.base64File
							});
						} else {
							oFile = [];
						}
					});
				}
			});

			let oTrafficPayload = {
				Files: oFiles
			};

			await this.createNewModelUsingAPI(
				'POST',
				'odata/v2/vehicleinspection/uploadAttachment',
				oTrafficPayload,
				'TrafficResAttachmentModel'
			);

			let oModel = this.getView().getModel('TrafficResAttachmentModel');
			let oData = oModel.getData();
			let lAttachmentData = oData.d.results;
			return lAttachmentData;
		},

		/**
		* Functon for Patch Attachment API 
		* @memberof adnoc.vi.vehicleinspection.modone.controller.ServiceTest
		* @version 1.0.0
		* @since 10.02.2025
		* @fires patchAttachmentDataTraffic
		* @author MM
		*/

		patchAttachmentDataTraffic: async function () {

			let oSaveResModel = this.getView().getModel("TrafficSaveModel");
			let oTrafficResModel = this.getView().getModel('TrafficResAttachmentModel');
			let oTrafficResData = oTrafficResModel.getData().d.results; // Attachments
			let oSaveResData = oSaveResModel.getData().d;               // Save data (for GUID)
			let sVechileOrderCharGUID = oSaveResData.VehicleOrderInspectionLinesTestCharUUID; // Your docGuid

			if (!sVechileOrderCharGUID) {
				MessageBox.error(this.oBundle.getText("traffic_MessageBoxForGuidNotFound"));
				return;
			}

			let aFilesPayload = [];

			// 🛠 Prepare required payload
			oTrafficResData.forEach((oAttachment) => {
				aFilesPayload.push({
					attachmentGuId: oAttachment.attachmentGuId,
					docGuid: sVechileOrderCharGUID
				});
			});

			let oPayload = {
				Files: aFilesPayload
			};
			await this.createNewModelUsingAPI('POST', 'odata/v2/vehicleinspection/updateAttachmentDocGuid', oPayload, 'PatchResponseModel');
			let oAttachmentPatchModel = this.getView().getModel('PatchResponseModel');
			let oData = oAttachmentPatchModel.getData();

		},

		/**
		* Functon for Final Structure for Attachment
		* @memberof adnoc.vi.vehicleinspection.modone.controller.ServiceTest
		* @version 1.0.0
		* @since 10.02.2025
		* @fires onBtnPressSaveAttachmentFiles,onBtnPressCloseFileUpload
		* @author MM
		*/

		onBtnPressSaveAttachmentFiles: function (oEvent) {
			// Get Fragment or Parent View reference safely
			let oFileUploadModel = this.getView().getModel("FileUploadedModel");
			let oFIleUploadData = oFileUploadModel.getData();
			oFileUploadModel.refresh(true);
			if (oFIleUploadData.FileCategory.length != 0) {
				this.onBtnPressCloseFileUpload();
			}
		},

		/**
		* Functon for File Change when upload files
		* @memberof adnoc.vi.vehicleinspection.modone.controller.ServiceTest
		* @version 1.0.0
		* @since 10.02.2025
		* @fires onBtnPressTrafficFileChange
		* @author MM
		*/

		onBtnPressTrafficFileChange: function (oEventOrFiles, iForcedIndex) {
			const oModel = this.getView().getModel("FileUploadedModel");
			const oModelData = oModel.getData();
			let aFiles = [];
			let iIndex;
			let oFileUploader;

			// Single or multiple File(s) passed directly (e.g., from camera)
			if (Array.isArray(oEventOrFiles)) {
				aFiles = oEventOrFiles;
				iIndex = iForcedIndex;

			} else if (oEventOrFiles instanceof File) {
				aFiles = [oEventOrFiles];
				iIndex = iForcedIndex;

			} else {
				// Normal file uploader input
				oFileUploader = oEventOrFiles.getSource();
				const fileList = oEventOrFiles.getParameter("files");
				aFiles = Array.from(fileList);

				const oContext = oFileUploader.getBindingContext("FileUploadedModel");

				if (!oContext) {
					return;
				}

				iIndex = oContext.getPath().split("/").pop();
			}

			const oSelectedCategory = oModelData.FileCategory[iIndex];

			if (!oSelectedCategory) {
				return;
			}

			if (!oSelectedCategory.Files) {
				oSelectedCategory.Files = [];
			}

			// Max file validation
			if (oSelectedCategory.Files.length + aFiles.length > 5) {
				MessageBox.warning(this.oBundle.getText("traffic_MessageBoxForFileMaxSize"));
				if (oFileUploader) oFileUploader.setValue("");
				return;
			}

			aFiles.forEach((file) => {
				if (file.size > 10 * 1024 * 1024) {
					MessageBox.warning(this.oBundle.getText("traffic_MessageBoxForFileMBSize"));
					if (oFileUploader) oFileUploader.setValue("");
					return;
				}

				this._readFileAsBase64Multiple(file, (base64) => {
					oSelectedCategory.Files.push({
						attachmentName: file.name,
						orgFileExtension: file.name.split('.').pop(),
						orgFileName: file.name,
						base64File: base64,
						source: file._source || "upload"
					});

					oModel.refresh(true);
				});
			});
		},

		/**
		* Functon for Generate Base64 Structure for Attachment
		* @memberof adnoc.vi.vehicleinspection.modone.controller.ServiceTest
		* @version 1.0.0
		* @since 10.02.2025
		* @fires _readFileAsBase64Multiple
		* @author MM
		*/

		_readFileAsBase64Multiple: function (file, callback) {

			const fReader = new FileReader();
			fReader.onload = function (event) {
				const base64String = event.target.result.split(",")[1]; // Get Base64 part of the string
				callback(base64String);
			};
			fReader.onerror = function (error) {
				MessageBox.error(this.oBundle.getText("traffic_MessageBoxForReadingFile") + file.name);
			};
			fReader.readAsDataURL(file); // Read file as Data URL

		},

		/**
		* Functon for View Uploaded Files Fragment
		* @memberof adnoc.vi.vehicleinspection.modone.controller.ServiceTest
		* @version 1.0.0
		* @since 10.02.2025
		* @fires onBtnPressViewFiles
		* @author MM
		*/

		onBtnPressViewFiles: async function (oEvent) {

			if (!this.fileViewFlag) {
				this.fileViewFlag = sap.ui.xmlfragment("FileViewDialog", "adnoc.vi.vehicleinspection.modone.fragment.view.FileUploadView", this);
				this.getView().addDependent(this.fileViewFlag);
			}
			this.fileViewFlag.open();
		},

		/**
		* Functon for Get Attachment data API call
		* @memberof adnoc.vi.vehicleinspection.modone.controller.ServiceTest
		* @version 1.0.0
		* @since 10.02.2025
		* @fires onBtnPressGetAttachmentData
		* @author MM
		*/

		onBtnPressGetAttachmentData: async function () {

			let sVehicleGUUIDRes = this.getTrafficTestStatus();
			console.log(sVehicleGUUIDRes)
			await this.createNewModelUsingAPI('GET', `odata/v2/vehicleinspection/VehicleOrderInspectionLinesTestChar('${sVehicleGUUIDRes.VehicleOrderInspectionLinesTestCharUUID}')?$expand=testResTrafficAttachs`, '', 'AttachResponseModel');
			let oModelAttachRes = this.getView().getModel('AttachResponseModel').getData().d.testResTrafficAttachs.results;

			const oFileViewModel = this.getView().getModel('FileViewModel');
			const oFileViewData = oFileViewModel.getData();

			oModelAttachRes.map((item) => {
				item.uploadedDate = Formatter.convertV2ODataDateFormart_DD_MM_YYYY(item.uploadedDate)
				item.uploadedTime = Formatter.formatEdmTime(item.uploadedTime)
			})

			oFileViewData.FileDetail = oModelAttachRes;

			oFileViewModel.setData(oFileViewData);
			oFileViewModel.refresh(true);

		},

		/**
		* Functon for Close View File Dialog
		* @memberof adnoc.vi.vehicleinspection.modone.controller.ServiceTest
		* @version 1.0.0
		* @since 10.02.2025
		* @fires onBtnPressFileViewClose
		* @author MM
		*/

		onBtnPressFileViewClose: function () {
			if (this.fileViewFlag) {
				this.fileViewFlag.close();
			}
		},

		/**
		* Functon for View File Dialog
		* @memberof adnoc.vi.vehicleinspection.modone.controller.ServiceTest
		* @version 1.0.0
		* @since 10.02.2025
		* @fires displayAttachment
		* @author MM
		*/

		displayAttachment: function (attachmentData) {
			if (!attachmentData.getAttachmentByGuid || !attachmentData.getAttachmentByGuid.base64File || !attachmentData.getAttachmentByGuid.orgFileExtension) {
				MessageToast.show(this.oBundle.gettext("traffic_MessageBoxForInvalidAttachment"));
				return;
			}

			let sBase64 = attachmentData.getAttachmentByGuid.base64File;
			let sFileType = attachmentData.getAttachmentByGuid.orgFileExtension;

			let byteCharacters = atob(sBase64);
			let byteNumbers = Array.from(byteCharacters, char => char.charCodeAt(0));
			let byteArray = new Uint8Array(byteNumbers);
			let blob = new Blob([byteArray], { type: 'application/pdf' });
			let sBlobUrl = URL.createObjectURL(blob);

			if (sFileType === "pdf") {
				var oPDFViewer = new PDFViewer();
				this.getView().addDependent(oPDFViewer);
				oPDFViewer.setSource(sBlobUrl);
				oPDFViewer.open();
			}
			else if (["png", "jpg", "jpeg", "avif"].includes(sFileType.toLowerCase())) {
				const oDialog = new Dialog({
					title: "View Attachment",
					content: new sap.m.Image({
						src: sBlobUrl,
						width: "100%",
						height: "100%"
					}),
					endButton: new sap.m.Button({
						text: "Close",
						press: function () {
							oDialog.close(); // Use the dialog instance directly
						}
					})
				});

				// Open the dialog
				oDialog.open();
			}
			else {
				MessageToast.show(this.oBundle.getText("traffic_MessageBoxForUnSupported"));
			}
		},

		/**
		* Functon for View File Dialog handler
		* @memberof adnoc.vi.vehicleinspection.modone.controller.ServiceTest
		* @version 1.0.0
		* @since 10.02.2025
		* @fires onViewFileHandler,displayAttachment
		* @author MM
		*/

		onViewFileHandler: async function (oEvent) {

			// Process the selected attachment
			let oBindingContext = oEvent.getSource().getBindingContext("FileViewModel");
			let oSelectedAttachment = oBindingContext.getObject();
			if (!oSelectedAttachment || !oSelectedAttachment.attachmentGuId_attachmentGuId) {
				MessageToast.show(this.oBundle.getText("traffic_MessageBoxForMissing"));
				return;
			}

			// Proceed with the selected attachment
			let payload = {
				"attachmentGuId": oSelectedAttachment.attachmentGuId_attachmentGuId
			};
			await this.createNewModelUsingAPI("POST", "odata/v2/vehicleinspection/getAttachmentByGuid", payload, "viewAttachModel");
			const res = this.getApiResponseObject();

			if (res.success) {
				this.displayAttachment(res.object.d);
			} else {
				MessageBox.error(res.object.responseJSON.error.value || this.oBundle.getText("traffic_MessageBoxForFailed"));
			}
		},

		/**
		* Functon for View File Dialog handler
		* @memberof adnoc.vi.vehicleinspection.modone.controller.ServiceTest
		* @version 1.0.0
		* @since 10.02.2025
		* @fires onViewFileTraffic
		* @author MM
		*/

		onViewFileTraffic: async function (oEvent) {
			await this.onViewFileHandler(oEvent);
		},

		/**
		* Functon for Download File handler
		* @memberof adnoc.vi.vehicleinspection.modone.controller.ServiceTest
		* @version 1.0.0
		* @since 10.02.2025
		* @fires onDownloadFileHandler
		* @author MM
		*/

		onDownloadFileHandler: async function (oEvent) {

			let oBindingContext = oEvent.getSource().getBindingContext("FileViewModel");
			let oSelectedAttachment = oBindingContext.getObject();
			if (!oSelectedAttachment || !oSelectedAttachment.attachmentGuId_attachmentGuId) {
				MessageToast.show(this.oBundle.getText("traffic_MessageBoxForMissing"));
				return;
			}

			// Proceed with the selected attachment
			let payload = {
				"attachmentGuId": oSelectedAttachment.attachmentGuId_attachmentGuId
			};

			// API call to fetch the attachment data
			await this.createNewModelUsingAPI(
				"POST",
				"odata/v2/vehicleinspection/getAttachmentByGuid",
				payload,
				"downloadAttachModel"
			);

			const res = this.getApiResponseObject();

			if (res.success) {
				this.downloadAttachmentData(res.object.d);
			} else {
				MessageBox.error(res.object.responseJSON.error.value || this.oBundle.getText("traffic_MessageBoxForFailed"));
			}
		},

		/**
		* Functon for Download File
		* @memberof adnoc.vi.vehicleinspection.modone.controller.ServiceTest
		* @version 1.0.0
		* @since 10.02.2025
		* @fires downloadAttachmentData
		* @author MM
		*/

		downloadAttachmentData: function (downloaData) {
			var sBase64 = downloaData.getAttachmentByGuid.base64File;
			var sFileType = downloaData.getAttachmentByGuid.orgFileExtension;
			var actualFileName = downloaData.getAttachmentByGuid.attachmentName;

			// Convert base64 to binary (Blob)
			var byteCharacters = atob(sBase64);
			var byteNumbers = new Array(byteCharacters.length);
			for (var i = 0; i < byteCharacters.length; i++) {
				byteNumbers[i] = byteCharacters.charCodeAt(i);
			}
			var byteArray = new Uint8Array(byteNumbers);
			var blob = new Blob([byteArray], { type: sFileType });
			// Create a Blob URL and trigger download
			var sBlobUrl = URL.createObjectURL(blob);
			var aLink = document.createElement('a');
			aLink.href = sBlobUrl;
			aLink.download = actualFileName; // Assuming file extension is part of sFileType
			aLink.click();
			MessageToast.show(this.oBundle.getText("traffic_MessageBoxForDownload"));
		},

		/**
		* Functon for Download File
		* @memberof adnoc.vi.vehicleinspection.modone.controller.ServiceTest
		* @version 1.0.0
		* @since 10.02.2025
		* @fires onDownloadTrafficTest,onDownloadFileHandler
		* @author MM
		*/

		onDownloadTrafficTest: async function (oEvent) {
			await this.onDownloadFileHandler(oEvent);
		},

		/**
		* Functon for Validate Attahcment Files
		* @memberof adnoc.vi.vehicleinspection.modone.controller.ServiceTest
		* @version 1.0.0
		* @since 10.02.2025
		* @fires onValidateAttachedFile
		* @author MM
		*/

		onValidateAttachedFile: async function () {
			let isAttach = false;
			let oFileUploadModel = this.getView().getModel("FileUploadedModel").getData();
			let aRawPreviousData = this.getView().getModel("AttachResponseModel").getData().d.testResTrafficAttachs.results;

			// Check if all new uploads have either empty arrays or only empty/null files
			let hasEmptyNewUpload = oFileUploadModel.FileCategory.every(category => {
				return category.Files.length === 0 || category.Files.every(file => {
					return !file.attachmentGuId && !file.attachmentName && !file.base64File;
				});
			});

			if (hasEmptyNewUpload) {
				isAttach = true;
				MessageBox.warning(this.oBundle.getText("traffic_MessageBoxForUploadValidFile"));
				return isAttach;
			}

			return isAttach;
		},

		/**
		* Functon for Open Camera in Fragment
		* @memberof adnoc.vi.vehicleinspection.modone.controller.ServiceTest
		* @version 1.0.0
		* @since 10.02.2025
		* @fires onOpenCameraDialog,onCaptureImage
		* @author MM
		*/

		onOpenCameraDialog: function (oEvent) {
			const oContext = oEvent.getSource().getBindingContext("FileUploadedModel");
			const iIndex = oContext.getPath().split("/").pop();

			this._currentUploadIndex = iIndex; // Store index for later

			// Now open the camera dialog
			this.onCaptureImage();
		},

		/**
		* Functon for Captured Image from Camera
		* @memberof adnoc.vi.vehicleinspection.modone.controller.ServiceTest
		* @version 1.0.0
		* @since 10.02.2025
		* @fires onCaptureImage
		* @author MM
		*/

		onCaptureImage: function (oEvent) {
			const that = this;

			if (!this._cameraDialog) {
				this._cameraDialog = sap.ui.xmlfragment(this.getView().getId(), "adnoc.vi.vehicleinspection.modone.fragment.view.CameraCapture", this);
				this.getView().addDependent(this._cameraDialog);
			}

			this._cameraDialog.open();

			// Start camera after open
			setTimeout(() => {
				navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" }, audio: false })
					.then(function (stream) {
						that._cameraStream = stream;
						const videoElement = document.getElementById("cameraStream");
						if (videoElement) {
							videoElement.srcObject = stream;
						}
					})
					.catch(function (err) {
						MessageBox.error(this.oBundle.getText("traffic_MessageBoxForCameraAccess") + ' ' + err.message);
					});
			}, 500); // Delay for dialog rendering
		},

		/**
		* Functon for Take Photo
		* @memberof adnoc.vi.vehicleinspection.modone.controller.ServiceTest
		* @version 1.0.0
		* @since 10.02.2025
		* @fires onTakePhoto
		* @author MM
		*/

		onTakePhoto: function () {
			const video = document.getElementById("cameraStream");
			const canvas = document.createElement("canvas");
			canvas.width = video.videoWidth;
			canvas.height = video.videoHeight;
			const ctx = canvas.getContext("2d");
			ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

			const that = this;
			canvas.toBlob(function (blob) {
				const timestamp = Date.now();
				const randomString = Math.random().toString(36).substring(2, 8);
				const filename = `captured_${timestamp}_${randomString}.jpg`;
				const file = new File([blob], filename, { type: "image/jpeg" });
				file._source = "camera";

				const iCurrentCategoryIndex = that._currentUploadIndex; // ← You must set this before opening the camera
				that.isCameraCaptured(file);
				that.onBtnPressTrafficFileChange(file, iCurrentCategoryIndex);
				MessageToast.show(that.oBundle.getText("traffic_MessageBoxForImageCaptured"));
				that.onCloseCameraDialog(); // Optional: close after capture
			}, "image/jpeg");
		},

		/**
		* Functon for Switch Camera Back or Front
		* @memberof adnoc.vi.vehicleinspection.modone.controller.ServiceTest
		* @version 1.0.0
		* @since 10.02.2025
		* @fires onSwitchCamera,restartCameraStream
		* @author MM
		*/

		onSwitchCamera: function () {
			sFacingMode = sFacingMode === "environment" ? "user" : "environment";
			this.restartCameraStream();
		},

		/**
		* Functon for Re Start Camera Stream
		* @memberof adnoc.vi.vehicleinspection.modone.controller.ServiceTest
		* @version 1.0.0
		* @since 10.02.2025
		* @fires restartCameraStream
		* @author MM
		*/

		restartCameraStream: function () {
			const that = this;

			// Stop previous stream if active
			if (this._cameraStream) {
				this._cameraStream.getTracks().forEach(track => track.stop());
				this._cameraStream = null;
			}

			// Start new stream with updated facing mode
			navigator.mediaDevices.getUserMedia({ video: { facingMode: sFacingMode }, audio: false })
				.then(function (stream) {
					that._cameraStream = stream;
					const videoElement = document.getElementById("cameraStream");
					if (videoElement) {
						videoElement.srcObject = stream;
					}
				})
				.catch(function (err) {
					sap.m.MessageBox.error(this.oBundle.getText("traffic_MessageBoxForCameraAccess") + ' ' + err.message);
				});
		},

		/**
		* Functon for is Image Captured or Not ?
		* @memberof adnoc.vi.vehicleinspection.modone.controller.ServiceTest
		* @version 1.0.0
		* @since 10.02.2025
		* @fires isCameraCaptured
		* @author MM
		*/

		isCameraCaptured: function (aFiles) {
			return Array.isArray(aFiles) && aFiles.some(file => file.source === "camera") ? "Accept" : "Transparent";
		},

		/**
		* Functon for Image Captured Count
		* @memberof adnoc.vi.vehicleinspection.modone.controller.ServiceTest
		* @version 1.0.0
		* @since 10.02.2025
		* @fires isCameraCapturedCount
		* @author MM
		*/

		isCameraCapturedCount: function (aFiles) {
			return Array.isArray(aFiles) && aFiles.length > 0 && aFiles.some(file => file.source === "camera");
		},

		/**
		* Functon for Close Camera Dialog
		* @memberof adnoc.vi.vehicleinspection.modone.controller.ServiceTest
		* @version 1.0.0
		* @since 10.02.2025
		* @fires onCloseCameraDialog
		* @author MM
		*/

		onCloseCameraDialog: function () {
			if (this._cameraDialog) {
				this._cameraDialog.close();
			}
			if (this._cameraStream) {
				this._cameraStream.getTracks().forEach(track => track.stop());
				this._cameraStream = null;
			}
		},

		/**
		* Functon triggred for calling delete API for Attached Files
		* @memberof adnoc.vi.vehicleinspection.modone.controller.ServiceTest
		* @version 1.0.0
		* @since 10.02.2025
		* @fires deleteAttachmentFromTable
		* @author MM
		*/

		deleteAttachmentFromTable: async function (oDelFileObj) {

			await this.createNewModelUsingAPI("DELETE", `odata/v2/vehicleinspection/TestResTrafficAttachs(${oDelFileObj[0].testResultsAttachsUUID})`, '', "deleteAttachTableModel");
			const oDeleteResponse = this.getApiResponseObject();

			if (oDeleteResponse.success) {
				console.log(this.getView().getModel("deleteAttachTableModel"))
			} else {
				MessageBox.error(oDeleteResponse.object.responseJSON.error.message.value);
			}
		},

		/**
		* Functon triggred for calling delete API for Attached Files
		* @memberof adnoc.vi.vehicleinspection.modone.controller.ServiceTest
		* @version 1.0.0
		* @since 10.02.2025
		* @fires deleteAttachmentTraffic
		* @author MM
		*/

		deleteAttachmentTraffic: async function (oEvent) {

			let oBindingContext = oEvent.getSource().getBindingContext("FileViewModel");
			let oSelectedAttachment = oBindingContext.getObject();

			if (!oSelectedAttachment || !oSelectedAttachment.attachmentGuId_attachmentGuId) {
				MessageToast.show(this.oBundle.getText("traffic_MessageBoxForMissing"));
				return;
			}

			let oDelPayload = {
				"Files": [
					{
						"attachmentGuId": oSelectedAttachment.attachmentGuId_attachmentGuId
					}
				]
			};

			await this.createNewModelUsingAPI("POST", "odata/v2/vehicleinspection/deleteAttachmentFromDMS", oDelPayload, "deleteAttachModel");
			const oDeleteResponse = this.getApiResponseObject();

			if (oDeleteResponse.success) {
				MessageToast.show(this.oBundle.getText("fileView_AttachedDeleted"));

				let oFileViewModel = this.getView().getModel("FileViewModel");
				let aFileViewData = oFileViewModel.getProperty("/FileDetail"); // assume your array path is /Attachments

				let iDelFileIndex = aFileViewData.findIndex(item =>
					item.attachmentGuId_attachmentGuId === oSelectedAttachment.attachmentGuId_attachmentGuId
				);

				let oDelFileObj = aFileViewData.filter(item =>
					item.attachmentGuId_attachmentGuId === oSelectedAttachment.attachmentGuId_attachmentGuId
				);

				if (iDelFileIndex > -1) {
					aFileViewData.splice(iDelFileIndex, 1); // Remove 1 item at that index

					// aFileViewData.forEach((item, index) => {
					// 	item.testMainTypeSrNo = index + 1;
					// });

					// ✅ Update model
					oFileViewModel.setProperty("/FileDetail", aFileViewData);
					this.deleteAttachmentFromTable(oDelFileObj);
				}


			} else {
				MessageBox.error(oDeleteResponse.object.responseJSON.error.message.value);
			}
		},


		/**
		* Functon triggred open Confirmation Dialog for Attached Files
		* @memberof adnoc.vi.vehicleinspection.modone.controller.ServiceTest
		* @version 1.0.0
		* @since 10.02.2025
		* @fires onBtnPressDeleteAttachment
		* @author MM
		*/


		onBtnPressDeleteAttachment: function (oEvent) {

			MessageBox.confirm(
				this.oBundle.getText("salesOrder_messageToastAreyousureyouwanttoConfirm"), {
				icon: MessageBox.Icon.INFORMATION,
				title: "Delete Data",
				class: "sapUiSizeCompact",
				actions: [MessageBox.Action.YES, MessageBox.Action.NO],
				onClose: function (oAction) {
					if (oAction === "YES") {
						this.deleteAttachmentTraffic(oEvent);
					}
				}.bind(this)
			});
		},

		//#endregion

		//#region ComprehensiveRegion

		/**Function to open the fragment comprehensive test 
		 * @memberof adnoc.vi.vehicleinspection.modone.controller.ServiceTest
		 * @version 1.0.0
		 * @since 01.01.2025
		 * @author MA
		 * @fires fetchComprehensiveData,onLoadAfterSaveFetchComprehensiveData,createModeForComprehensive
		 */
		onBtnPressComprehensiveTest: async function () {
			let sApplicableCom = this.oBundle.getText("ServiceTest_ApplicableCom");
			let aUpdatedData = this.getView().getModel('lUpdateModelServiceTestModel').getData();
			let oCharStatusList = this.charStatusData
			let aFetchedComprehensiveData;
			oCharStatusList = aUpdatedData.results.find(Item => { return Item.vehicleOrderInspectionLines === oCharStatusList.vehicleOrderInspectionLines })
			const oFilteredResults = oCharStatusList.vehOrdInspLinesTestChars.results.filter(item => item.applicableTestName === Constant.TESTTYPE.COMPREHENSIVE);
			const vehicleOrderGuid = oFilteredResults.filter(item => item.applicableTestName === Constant.TESTTYPE.COMPREHENSIVE)
				.map(item => ({
					testUUID: item.VehicleOrderInspectionLinesTestCharUUID,
					testStatus: item.testStatus,
					applicableTestName: item.applicableTestName
				}));
			if (vehicleOrderGuid.length <= 0) {
				MessageBox.warning(sApplicableCom);
				return
			}

			if (vehicleOrderGuid[0].testStatus == Constant.STATUS.OPEN) {
				aFetchedComprehensiveData = await this.fetchComprehensiveData();
			} else {
				aFetchedComprehensiveData = await this.onLoadAfterSaveFetchComprehensiveData(vehicleOrderGuid[0].testUUID);
			}
			if (vehicleOrderGuid[0].testStatus === Constant.STATUS.FAIL || vehicleOrderGuid[0].testStatus === Constant.STATUS.COMPLETE) {
				var oModel = new JSONModel({
					isButtonVisible: false,
					isRadioButton: false,
					ischeckBox: false
				});
			} else {
				var oModel = new JSONModel({
					isButtonVisible: true,
					isRadioButton: false,
					ischeckBox: true
				});
			}
			this.getView().setModel(oModel, "ButtonVisibleModel");
			if (aFetchedComprehensiveData.length > 0) {
				let oData = { responseArray: aFetchedComprehensiveData[0] };
				let oModel = new JSONModel(oData);
				this.getView().setModel(oModel, "aComprehensiveModel");
				this.createModeForComprehensive(aFetchedComprehensiveData);
			} else {
				let oData = { responseArray: aFetchedComprehensiveData.aResponseArray };
				let oModel = new JSONModel(oData);
				this.getView().setModel(oModel, "aComprehensiveModel");
				this.createModeForComprehensive(aFetchedComprehensiveData.aResponseArray);
			}
			this.getView().getModel("aComprehensiveModel").setProperty(`/testComments`, oFilteredResults[0].testComments);
			if (!this.Comprehensivefrag) {
				this.Comprehensivefrag = sap.ui.xmlfragment(
					this.getView().getId(),
					"adnoc.vi.vehicleinspection.modone.fragment.view.ComprehensiveTest",
					this
				);
				this.getView().addDependent(this.Comprehensivefrag);
			}
			if (this.Comprehensivefrag.isOpen()) {
				this.Comprehensivefrag.close();
			}

			if (!this.Comprehensivefrag.isOpen()) {

				this.Comprehensivefrag.open();

			}
		},

		/**Function to create payload for the comprehensive test
		 * @memberof adnoc.vi.vehicleinspection.modone.controller.ServiceTest
		 * @version 1.0.0
		 * @since 01.01.2025
		 * @author MA
		 * @fires
		 */
		generateComprehensiveResultPayload(oSharePayload) {
			console.log(oSharePayload)
			if (!oSharePayload)
				return console.log("Payload not null allow ");
			let aPayload = []
			oSharePayload.responseArray.forEach(parent => {
				parent.SubCategory.forEach(subCategory => {
					subCategory.ChildSubCategory = subCategory.ChildSubCategory.filter(child => child.Selected === true);
				});
			});
			oSharePayload.responseArray.forEach(Item => {
				Item.SubCategory.forEach((SubItem, Index) => {
					let ldata = {
						testMainTypeSrNo: Index + 1,
						vehicleOrderInspectionLinesTestChar_VehicleOrderInspectionLinesTestCharUUID: null,
						testMainTypeNo: Item.testMainTypeNo,
						testMainTypeTextEnglish: Item.testMainType,
						examinationMethodEnglish: Item.examinationMethodEnglish,
						examinationMethodArabic: Item.examinationMethodArabic,
						controlTypeValueLabel1: Item.controlTypeValueLabel1,
						controlTypeValueLabel2: Item.controlTypeValueLabel2,
						testMainTypeTextArabic: Item.testMainTypeTextArabic,
						testMainTypeTextArabic: Item.testMainTypeTextArabic,
						testSubTypeTextEnglish: SubItem.testSubTypeTextEnglish,
						testSubTypeTextArabic: SubItem.testSubTypeTextArabic,
						controlTypeValueLabel1Flag: SubItem.controlTypeValueLabel1 ?? false,
						controlTypeValueLabel2Flag: SubItem.controlTypeValueLabel2 ?? false,
						conditionalMappingMasterCode: SubItem.conditionalMappingMasterCode,
						compResSubTypesText: SubItem.compResSubTypesText,
						compResSubTypes: []

					}

					if (SubItem.conditionalMappingMasterCode === 'M_VHPT') {
						SubItem.ChildSubCategory.forEach(deepChild => {
							let lDeepChild = {
								testTypeTextEnglish: deepChild.testTypeTextEnglish,
								testTypeTextArabic: deepChild.testTypeTextArabic,
								testTypeKey: null
							}
							ldata.compResSubTypes.push(lDeepChild);
						});

					} else {
						let lDeepChild = {
							testTypeTextEnglish: SubItem.compResSubTypesText,
							testTypeTextArabic: null,
							testTypeKey: null

						}
						ldata.compResSubTypes.push(lDeepChild);
					}
					aPayload.push(ldata);

				});
			});
			const oFinalPayload = {
				applicableTestName: null,
				testComments: oSharePayload.testComments,
				testInspectedBy: null,
				testInspectionEndDate: null,
				testInspectionStartDate: null,
				testStatus: null,
				vehicleOrderInspectionLines_vehicleOrderInspectionLines: oSharePayload.vehicleOrderInspectionLines_vehicleOrderInspectionLines,
				testResComps: aPayload
			};
			return oFinalPayload;
		},

		/**Function to delete data from the comprehensive test
		 * @memberof adnoc.vi.vehicleinspection.modone.controller.ServiceTest
		 * @version 1.0.0
		 * @since 01.01.2025
		 * @author MA
		 * @fires
		 */
		deleteComprehensiveResults: async function (oPayload, sVehicleGUID) {
			const oPayloadCom = {
				applicableTestName: oPayload.applicableTestName,
				testComments: null,
				testInspectedBy: oPayload.testInspectedBy,
				testInspectionEndDate: oPayload.testInspectionEndDate,
				testInspectionStartDate: oPayload.testInspectionStartDate,
				testStatus: oPayload.testStatus,
				testResComps: null
			};
			await this.createNewModelUsingAPI(
				'PATCH',
				`odata/v2/vehicleinspection/VehicleOrderInspectionLinesTestChar('${sVehicleGUID}')`,
				oPayloadCom,
				'ComprehensiveDataModelFordelete'
			);
			const aInsertedDataModel = this.getView().getModel("ComprehensiveDataModelFordelete");
			this.getView().setModel(aInsertedDataModel, "InsertedDataModel");
		},


		/**Function to fetch data for the comprehensive test Result 
		 * @memberof adnoc.vi.vehicleinspection.modone.controller.ServiceTest
		 * @version 1.0.0
		 * @since 01.01.2025
		 * @author MA
		 * @fires
		 */
		fetchComprehensiveData: async function () {
			await this.createNewModelUsingAPI(
				'POST',
				'odata/v2/vehicleinspection/fetchComprehensiveData',
				'',
				'ComprehensiveDataModel'
			);
			let oModel = this.getView().getModel('ComprehensiveDataModel').getData();
			let aComprehensiveData = oModel.d.fetchComprehensiveData;
			return aComprehensiveData;
		},

		/**Function to close fragment for the comprehensive test Result 
		 * @memberof adnoc.vi.vehicleinspection.modone.controller.ServiceTest
		 * @version 1.0.0
		 * @since 01.01.2025
		 * @author MA
		 * @fires
		 */
		onBtnPressCloseComprehensive: function () {
			if (this.Comprehensivefrag) {
				this.Comprehensivefrag.close();
			}
		},

		/**Function use when the radio button is selected from comprehensive Test
		 * @memberof adnoc.vi.vehicleinspection.modone.controller.ServiceTest
		 * @version 1.0.0
		 * @since 01.01.2025
		 * @author MA
		 * @fires
		 */
		onBtnPressPaintedOption: function (oEvent) {
			let sValidation = this.oBundle.getText("validComprehensivePainted");
			let oRadioButton = oEvent.getSource();
			let oContext = oRadioButton.getBindingContext("aComprehensiveModel");
			if (!oContext) {
				// console.log("No context available");
				return;
			}
			let oData = oContext.getObject();
			if (oRadioButton.getSelected()) {
				if (oRadioButton.getId().includes("Painted")) {
					oData.Painted = true;
					oData.NonPainted = false;

				} else if (oRadioButton.getId().includes("NotPainted")) {
					oData.NonPainted = true;
					oData.Painted = false;
				} else {
					console.log(sValidation);
				}
				oContext.getModel().setProperty(oContext.getPath(), oData);
				// let allModifyData = this.getView().getModel("aComprehensiveModel").getData();
				// console.log("Show: ", JSON.stringify(this.getView().getModel("aComprehensiveModel").getData()));
			}
		},

		/**"Function to modify the payload data.
		 * @memberof adnoc.vi.vehicleinspection.modone.controller.ServiceTest
		 * @version 1.0.0
		 * @since 01.01.2025
		 * @author MA
		 * @fires
		 */
		createModeForComprehensive: function (aResData) {

			let aFormattedData = [];
			aResData.forEach((mainItem, mainIndex) => {

				let oParent = {
					id: "parent_" + mainIndex,
					testMainTypeNo: mainItem.testMainTypeNo,
					testMainType: mainItem.testMainType,
					testMainTypeTextEnglish: mainItem.testTextNo,
					testMainTypeTextArabic: mainItem.testMainTypeTextArabic,
					isParent: true,
					controlTypeValueLabel1: mainItem.controlTypeValueLabel1,
					controlTypeValueLabel2: mainItem.controlTypeValueLabel2,
					controlTypeValueLabel3: mainItem.controlTypeValueLabel3,
					controlTypeValueLabel4: mainItem.controlTypeValueLabel4,
					examinationMethodEnglish: mainItem.examinationMethodEnglish,
					examinationMethodArabic: mainItem.examinationMethodArabic,
					SubCategory: []
				};
				mainItem.SubCategory.forEach((subItem, subIndex) => {
					let oChild = {
						id: "child_" + mainIndex + "_" + subIndex,
						testSubTypeTextEnglish: subItem.testSubTypeTextEnglish,
						testSubTypeTextArabic: subItem.testSubTypeTextArabic,
						controlTypeValueLabel1: subItem.controlTypeValueLabel1,
						controlTypeValueLabel2: subItem.controlTypeValueLabel2,
						conditionalMappingMasterCode: subItem.conditionalMappingMasterCode,
						compResSubTypesText: subItem.compResSubTypesText,
						isParent: false,
						ChildSubCategory: []
					};
					subItem.ChildSubCategory.forEach((childSubItem, subIndex) => {
						let cChild = {
							id: "child_" + mainIndex + "_" + subIndex + "_" + subIndex,
							testTypeNo: childSubItem.testTypeNo,
							testTypeTextEnglish: childSubItem.testTypeTextEnglish,
							testTypeTextArabic: childSubItem.testTypeTextArabic,
							Selected: childSubItem.Selected,

						};
						oChild.ChildSubCategory.push(cChild);

					});
					oParent.SubCategory.push(oChild);
				});

				aFormattedData.push(oParent);
			});
			let oModel = new JSONModel({ responseArray: aFormattedData });
			this.getView().setModel(oModel, "aComprehensiveModel");

		},

		/**Function used to merge data from TestType to TestTypeResult.
		 * @memberof adnoc.vi.vehicleinspection.modone.controller.ServiceTest
		 * @version 1.0.0
		 * @since 01.01.2025
		 * @author MA
		 * @fires generateComprehensiveResultPayload,getDateFromatIn_yyyyMMdd_HH_MM_SS,deleteComprehensiveResults,updateServiceTestModel,onBtnPressCloseComprehensive
		 */

		onLoadAfterSaveFetchComprehensiveData: async function (ServiceGuid) {
			await this.createNewModelUsingAPI(
				'POST',
				'odata/v2/vehicleinspection/fetchComprehensiveData',
				'',
				'MargeDataDelectedOrNot'
			);
			let oModelModify = this.getView().getModel('MargeDataDelectedOrNot');
			let oDataModify = oModelModify.getData();

			console.log("oDataModify", oDataModify);
			let payload = {
				VehicleOrderInspectionLinesTestCharUUID: ServiceGuid
			}
			await this.createNewModelUsingAPI(
				'POST',
				'odata/v2/vehicleinspection/getTestResultComprehensiveById',
				payload,
				'ComprehensiveDataModel'
			);

			let oModel = this.getView().getModel('ComprehensiveDataModel');
			let oData = oModel.getData();
			let lComprehensiveData = oData.d.results;
			console.log("lComprehensiveData", lComprehensiveData);

			lComprehensiveData.forEach(item_2 => {

				item_2.SubCategory.forEach(sub_cat_2 => {
					const test_main_type_no_2 = item_2.testMainTypeNo;
					const test_main_type_2 = item_2.testMainType;
					const test_sub_type_text_english_2 = sub_cat_2.testSubTypeTextEnglish;
					const test_sub_type_text_arabic_2 = sub_cat_2.testSubTypeTextArabic;
					let outerMasterCode = sub_cat_2.conditionalMappingMasterCode;

					oDataModify.d.fetchComprehensiveData.aResponseArray.forEach(main_item => {
						main_item.SubCategory.forEach(main_sub_cat => {// If conditions match
							const MasterCode = main_sub_cat.conditionalMappingMasterCode
							if (
								main_item.testMainTypeNo == test_main_type_no_2 &&
								main_item.testMainType == test_main_type_2 &&
								main_sub_cat.testSubTypeTextEnglish == test_sub_type_text_english_2 &&
								main_sub_cat.testSubTypeTextArabic == test_sub_type_text_arabic_2
							) {

								main_sub_cat.controlTypeValueLabel1 = sub_cat_2.controlTypeValueLabel1
								main_sub_cat.controlTypeValueLabel2 = sub_cat_2.controlTypeValueLabel2
								main_sub_cat.conditionalMappingMasterCode = sub_cat_2.conditionalMappingMasterCode
								main_sub_cat.compResSubTypesText = sub_cat_2.compResSubTypesText

								if (main_sub_cat.conditionalMappingMasterCode == "TEXT") {
									console.log("Matched TEXT!" + JSON.stringify(sub_cat_2.ChildSubCategory));
									console.log("length !" + JSON.stringify(main_sub_cat.ChildSubCategory));
									if (Array.isArray(main_sub_cat.ChildSubCategory) && main_sub_cat.ChildSubCategory.length === 0) {
										main_sub_cat.ChildSubCategory = sub_cat_2.ChildSubCategory
									}


								}


								sub_cat_2.ChildSubCategory.forEach(child_2 => {
									const test_uuid_2 = child_2.testTypeTextEnglish;
									main_sub_cat.ChildSubCategory.forEach(main_child => {

										if (main_child.testTypeTextEnglish == test_uuid_2) {

											main_child.Selected = child_2.Selected;

										}

									});
								});
							}
						});
					});
				});
			});

			oModelModify.refresh(true);

			console.log("-------------------------", oModelModify.oData.d.fetchComprehensiveData.aResponseArray);
			return oModelModify.oData.d.fetchComprehensiveData.aResponseArray//lComprehensiveData;

		},

		/**Function that contains the save logic for the comprehensive test result.
		 * @memberof adnoc.vi.vehicleinspection.modone.controller.ServiceTest
		 * @version 1.0.0
		 * @since 01.01.2025
		 * @author MA
		 * @fires generateComprehensiveResultPayload,getDateFromatIn_yyyyMMdd_HH_MM_SS,deleteComprehensiveResults,updateServiceTestModel,onBtnPressCloseComprehensive
		 */
		onPressComprehensiveLogic: async function (oEvent) {
			let sValidComprehensiveUUID = this.oBundle.getText("Comprehensive_ValidComprehensiveUUID");
			let sButtonId = oEvent.getSource().getId().replace(this.getView().getId() + "--", "");// change Name 
			let aSelectedData = this.getView().getModel("aComprehensiveModel").getData();
			let aPayload = await this.generateComprehensiveResultPayload(aSelectedData);
			let sTestCharUUID = '';
			let dCurrentDate = new Date();
			let dFormattedDate = Formatter.getDateFromatIn_yyyyMMdd_HH_MM_SS(dCurrentDate)
			if (this.charStatusData && this.charStatusData.vehOrdInspLinesTestChars) {
				let aCharStatusList = this.charStatusData;

				const oFilteredResults = aCharStatusList.vehOrdInspLinesTestChars.results.filter(item => item.applicableTestName === Constant.TESTTYPE.COMPREHENSIVE);
				const aVehicleOrderGuid = oFilteredResults.filter(item => item.applicableTestName === Constant.TESTTYPE.COMPREHENSIVE)
					.map(item => ({
						testUUID: item.VehicleOrderInspectionLinesTestCharUUID,
						testStatus: item.testStatus,
						applicableTestName: item.applicableTestName
					}));

				if (aVehicleOrderGuid.length === 0) {
					console.error(sValidComprehensiveUUID);
					return;
				}

				sTestCharUUID = aVehicleOrderGuid[0].testUUID;
				aPayload.applicableTestName = aVehicleOrderGuid[0].applicableTestName;
				aPayload.testInspectedBy = sTestInspectedUserName;
				aPayload.testInspectionStartDate = dFormattedDate;
				aPayload.testInspectionEndDate = dFormattedDate;
				let status = aPayload.testResComps.every(item => item.controlTypeValueLabel2Flag === true) ? Constant.STATUS.COMPLETE : Constant.STATUS.FAIL;//change
				// if (Constant.STATUS.FAIL === status || Constant.STATUS.PASS === status) {
				// 	aPayload.testStatus = status;
				// } else {	
				if ((aVehicleOrderGuid[0].testStatus === Constant.STATUS.OPEN || aVehicleOrderGuid[0].testStatus === Constant.STATUS.INPROGRESS) && (sButtonId === Constant.BUTTONEVENT.BUTTONCOMPREHENSIVESAVE)) {
					aPayload.testStatus = Constant.STATUS.INPROGRESS
				} else if ((aVehicleOrderGuid[0].testStatus === Constant.STATUS.OPEN || aVehicleOrderGuid[0].testStatus === Constant.STATUS.INPROGRESS) && (sButtonId === Constant.BUTTONEVENT.BUTTONCOMPREHENSIVECOM)) {
					aPayload.testStatus = status;
				} else {
					aPayload.testStatus = aVehicleOrderGuid[0].testStatus;
				}
				// }


			}
			else {
				console.log("charStatusData or vehOrdInspLinesTestChars is undefined.");
			}
			await this.deleteComprehensiveResults(aPayload, sTestCharUUID);
			await this.createNewModelUsingAPI(
				'PATCH',
				`odata/v2/vehicleinspection/VehicleOrderInspectionLinesTestChar('${sTestCharUUID}')`,
				aPayload,
				'TestCharSaveModel'
			);
			this.updateServiceTestModel();
			this.onBtnPressCloseComprehensive();
		},

		/**Function that contains the  Comfirm logic for the comprehensive test result.
		 * @memberof adnoc.vi.vehicleinspection.modone.controller.ServiceTest
		 * @version 1.0.0
		 * @since 01.01.2025
		 * @author MA
		 * @fires onPressComprehensiveLogic
		 */
		onBtnPressConfirmComprehensive: async function (oEvent) {
			try {
				let oi18nModel = this.getView().getModel("i18n");// change 
				let sValidComprehensive = oi18nModel.getProperty('ValidComprehensive')
				let aSelectedData = this.getView().getModel("aComprehensiveModel").getData();
				let bValid = false;
				aSelectedData.responseArray.filter(Item => {
					Item.SubCategory.filter(SunItem => {
						if (SunItem.controlTypeValueLabel1 === false && SunItem.controlTypeValueLabel2 === false) {
							bValid = true;
						}
					})
				})
				if (bValid === true) {
					MessageBox.warning(sValidComprehensive);
					return
				}
				this.onPressComprehensiveLogic(oEvent);
			} catch (error) {
				throw console.log('Error: in the Confirm' + error.message);
			}
		},


		/**Function that contains the save logic for the comprehensive test result.
		 * @memberof adnoc.vi.vehicleinspection.modone.controller.ServiceTest
		 * @version 1.0.0
		 * @since 01.01.2025
		 * @author MA
		 * @fires onPressComprehensiveLogic
		 */
		onBtnPressSaveComprehensive: async function (oEvent) {
			try {
				this.onPressComprehensiveLogic(oEvent);
			} catch (error) {
				throw console.log('Error: in the Comfirm' + error.message);
			}
		},

		// Fetching data for the list on the click – currently not needed, so commented out.

		/**Function Selection Change
		 * @memberof adnoc.vi.vehicleinspection.modone.controller.ServiceTest
		 * @version 1.0.0
		 * @since 01.01.2025
		 * @author MA
		 * @fires onPressComprehensiveLogic
		 */
		// onSelectionChange: async function (oEvent) {
		// 	try {
		// 		let oItem = oEvent.getSource();
		// 		let oBindingContext = oItem.getBindingContext("aComprehensiveModel");
		// 		let oModel = oBindingContext.getModel();
		// 		let ilist = this.byId("myMultiList");
		// 		let iIndex = ilist.indexOfItem(ilist);
		// 		let oItemData = oBindingContext.getObject();
		// 		// console.log(oItemData);
		// 		let ComprehensiveSelectedModel = this.getView().getModel("aComprehensiveModel").getData();
		// 		// console.log(oItemData);
		// 		// this.charStatusData = oItemData;
		// 		this.mahaData = oItemData;
		// 		// let lUpdateModelServiceTestModel = new sap.ui.model.json.JSONModel(FilterData);
		// 		// this.getView().setModel(lUpdateModelServiceTestModel, 'lUpdateModelServiceTestModel');
		// 		console.log(ComprehensiveSelectedModel);

		// 	} catch (error) {
		// 		throw console.log("Error : in selected data" + error.message);
		// 	}

		// },

		//#endregion

		//#region ESMARegion
		/**
		 * This function GET the ESMA Test Result 
		 * @memberof  adnoc.vi.vehicleinspection.modone.controller.ServiceTest
		 * @version 1.0.0
		 * @since 19.05.2025
		 * @fires createNewModelUsingAPI
		 * @author DK
		 */
		getTestResultStatus: async function () {
			try {
				let oTestResultStatusList = this.charStatusData;
				const filteredResults = oTestResultStatusList.vehOrdInspLinesTestChars.results.filter(item => item.applicableTestName === "VI_ESMA_TEST");
				const vehicleOrderGuid = filteredResults.map(item => ({
					testCharUUID: item.VehicleOrderInspectionLinesTestCharUUID
				}));
				vehicleGUID = vehicleOrderGuid[0]?.testCharUUID;
				await this.createNewModelUsingAPI(
					'GET',
					`odata/v2/vehicleinspection/VehicleOrderInspectionLinesTestChar('${vehicleGUID}')`,
					'',
					'TestResultStatusModel'
				);
				let oData = this.getView().getModel('TestResultStatusModel').getData();;
				testStatus = oData.d.testStatus;
			} catch (error) {
				console.log("@getTestResultStatus : Error :-" + error.message);
			}
		},

		/**
		 * This function Select the all check boxs which is show in ESMA check list
		 * @memberof  adnoc.vi.vehicleinspection.modone.controller.ServiceTest
		 * @version 1.0.0
		 * @since 19.05.2025
		 * @fires 
		 * @author DK
		 */
		onSelectAllPress: function (oEvent) {
			const bSelected = oEvent.getParameter("selected");
			const oItems = this.byId("testTable").getItems();
			oItems.forEach(function (oItem) {
				const oCheckBox = oItem.getCells()[0];
				oCheckBox.setSelected(bSelected);
				const oContext = oItem.getBindingContext("TestTypeMasterModel");
				if (oContext) {
					oContext.setProperty("testFlag", bSelected);
				}
			});
		},

		/**
		 * This function Select the single Check boxs which is show in ESMA Check list
		 * @memberof  adnoc.vi.vehicleinspection.modone.controller.ServiceTest
		 * @version 1.0.0
		 * @since 19.05.2025
		 * @fires 
		 * @author DK
		 */
		onCheckBoxSelect: function () {
			const oTable = this.byId("testTable");
			const oItems = oTable.getItems();
			let bAllSelected = true;
			oItems.forEach(function (oItem) {
				const oCheckBox = oItem.getCells()[0];
				if (!oCheckBox.getSelected()) {
					bAllSelected = false;
				}
			});
			const oHeaderCheckbox = oTable.getColumns()[0].getAggregation("header");
			if (oHeaderCheckbox && oHeaderCheckbox.setSelected) {
				oHeaderCheckbox.setSelected(bAllSelected);
			}
		},



		/**
		 * This function filters the ESMA Test Result Status
		 * @memberof  adnoc.vi.vehicleinspection.modone.controller.ServiceTest
		 * @version 1.0.0
		 * @since 19.05.2025
		 * @fires 
		 * @author DK
		 */
		getESMATestStatus: function () {
			const oStatusModel = this.getView().getModel('lUpdateModelServiceTestModel');
			const oStatusData = oStatusModel.getData();
			let sESMAVehicleGUID = '';
			let aESMAVehicle = [];
			const oFilteredResults = this.charStatusData?.vehOrdInspLinesTestChars?.results?.filter(
				item => item.applicableTestName === Constant.TESTTYPE.ESMA
			);
			if (!oFilteredResults || oFilteredResults.length === 0) {
				return null;
			}
			aESMAVehicle = oFilteredResults.map(item => ({
				testUUID: item.VehicleOrderInspectionLinesTestCharUUID,
				testStatus: item.testStatus,
				applicableTestName: item.applicableTestName
			}));
			sESMAVehicleGUID = aESMAVehicle[0]?.testUUID;
			const aMatchingItems = oStatusData.results
				.flatMap(result => result.vehOrdInspLinesTestChars.results)
				.filter(item => item.VehicleOrderInspectionLinesTestCharUUID === sESMAVehicleGUID);
			return aMatchingItems[0];
		},

		/**
		 * This function open the fragment for the ESMA checklist.
		 * @memberof adnoc.vi.vehicleinspection.modone.controller.ServiceTest
		 * @version 1.0.0
		 * @since 19.05.2025
		 * @fires getESMATestStatus, getESMATestDataAfterSave ,getESMATestMasterData
		 * @author DK
		 */
		onBtnPressESMATest: async function () {
			let aMatchingItems = this.getESMATestStatus();
			let sTestStatus = aMatchingItems !== null ? aMatchingItems.testStatus : null;
			if (sTestStatus === Constant.STATUS.INPROGRESS || sTestStatus === Constant.STATUS.PASS || sTestStatus === Constant.STATUS.FAIL) {
				await this.getESMATestDataAfterSave();
			}
			if (!this._oDialogESMA && sTestStatus != null) {
				this._oDialogESMA = sap.ui.xmlfragment(
					"ESMATestDialog",
					"adnoc.vi.vehicleinspection.modone.fragment.view.ESMATest",
					this
				);
				this.getView().addDependent(this._oDialogESMA);
			}
			if (sTestStatus === null) {
				MessageBox.warning(this.oBundle.getText("esma_MessageTostForWarning"));
				return
			}
			if (sTestStatus === Constant.STATUS.OPEN) {
				let oModel = new JSONModel({});
				this.getView().setModel(oModel, "ESMASaveModel");
				this.getView().setModel(oModel, "ButtonVisibleModel");
				await this.getESMATestMasterData();
			}
			this._oDialogESMA.open();
		},

		/**
		 * This function close the ESMA fragment 
		 * @memberof adnoc.vi.vehicleinspection.modone.controller.ServiceTest
		 * @version 1.0.0
		 * @since 19.05.2025
		 * @fires 
		 * @author DK
		 */
		onBtnPressCloseESMA: function () {
			if (this._oDialogESMA) {
				this._oDialogESMA.close();
			}
		},

		/**
		 * This function retrieves data from the test type master for the ESMA checklist, such as the English and Arabic descriptions.
		 * @memberof adnoc.vi.vehicleinspection.modone.controller.ServiceTest
		 * @version 1.0.0
		 * @since 19.05.2025
		 * @fires onESMADialogOpened
		 * @author DK
		 */
		getESMATestMasterData: async function () {
			await this.createNewModelUsingAPI(
				"GET",
				`odata/v2/vehicleinspection/TestTypeMaster?$filter=testTextNo eq '2' and testText eq 'ESMA' &$orderby=testMainTypeNo asc`
				,
				"",
				"ESMAMasterModel"
			);
			const oMasterModel = this.getView().getModel("ESMAMasterModel");
			const oListModel = this.getView().getModel("ESMAListModel");
			const aMasterData = oMasterModel.getData().d.results;
			const aMappedResults = aMasterData.map(item => {
				return {
					testMainTypeNo: item.testMainTypeNo || null,
					testMainTypeTextArabic: item.testMainTypeTextArabic || null,
					testMainTypeTextEnglish: item.testMainTypeTextEnglish || null,
					testFlag: false,
					selectAll: false,
					modifiedBy: sTestInspectedUserName,
					createdBy : Formatter.getDateFromatIn_yyyyMMdd_HH_MM_SS(new Date())
				};
			});
			const bAllChecked = aMasterData.every(item => item.testFlag === true);
			this.onESMADialogOpened(bAllChecked);
			oListModel.setData({
				d: {
					results: aMappedResults
				}
			});
			oListModel.refresh(true);
		},

		/**
		 * This function get data form Test result ESMA
		 * @memberof  adnoc.vi.vehicleinspection.modone.controller.ServiceTest
		 * @version 1.0.0
		 * @since 19.05.2025
		 * @fires getESMATestStatus, createNewModelUsingAPI, onESMADialogOpened
		 * @author DK
		 */
		getESMATestDataAfterSave: async function () {
			let aMatchingItems = this.getESMATestStatus();
			let sESMACharUUID = aMatchingItems.VehicleOrderInspectionLinesTestCharUUID;
			let sTestStatus = aMatchingItems.testStatus;
			await this.createNewModelUsingAPI(
				"GET",
				`odata/v2/vehicleinspection/TestResultsESMA?$filter=vehicleOrderInspectionLinesTestChar_VehicleOrderInspectionLinesTestCharUUID eq '${sESMACharUUID}' &$orderby=testMainTypeNo asc`,
				"",
				"ESMAAfterSaveModel"
			);
			const oESMAApiResponseMode = this.getView().getModel("ESMAAfterSaveModel");
			const aApiResults = oESMAApiResponseMode.getData().d.results;
			if (sTestStatus === Constant.STATUS.PASS || sTestStatus === Constant.STATUS.FAIL) {
				var oModel = new sap.ui.model.json.JSONModel({
					isButtonVisible: false,
					isControlEditable: false,
				});
			} else {
				var oModel = new sap.ui.model.json.JSONModel({
					isButtonVisible: true,
					isControlEditable: true,
				});
			}
			this.getView().setModel(oModel, "ButtonVisibleModel");
			let oTestTypeESMAResponseModel = this.getView().getModel("ESMAListModel");
			let testTypeESMAResponseData = oTestTypeESMAResponseModel.getData();
			if (aApiResults !== undefined) {
				const aMappedResults = aApiResults.map(item => {
					return {
						testMainTypeNo: item.testMainTypeNo || null,
						testMainTypeTextArabic: item.testMainTypeTextArabic || null,
						testMainTypeTextEnglish: item.testMainTypeTextEnglish || null,
						testFlag: item.testFlag === Constant.STATUS.YES,
						modifiedBy: item.modifiedBy || null,
						createdBy : item.createdBy || null
					};
				});
				const bAllChecked = aMappedResults.every(item => item.testFlag === true);
				this.onESMADialogOpened(bAllChecked);
				oTestTypeESMAResponseModel.setData({
					d: {
						results: aMappedResults
					}
				});
				oTestTypeESMAResponseModel.refresh(true);
			}
			else {
				const oESMAResultModel = new JSONModel({});
				this.getView().setModel(oESMAResultModel, "ESMAMasterModel");
				oTestTypeESMAResponseModel.refresh(true);
			}
		},

		/**
		 * This function opens the ESMA checklist fragment for selected or unselected checkboxes.
		 * @memberof adnoc.vi.vehicleinspection.modone.controller.ServiceTest
		 * @version 1.0.0
		 * @since 19.05.2025
		 * @fires event1,
		 * @author DK
		 */
		onESMADialogOpened: function (bAllChecked) {
			const oCheckbox = sap.ui.core.Fragment.byId("ESMATestDialog", "selectAllCheckbox");
			if (oCheckbox && typeof bAllChecked === "boolean") {
				oCheckbox.setSelected(bAllChecked);
				return bAllChecked;
			}
		},

		/**
		 * This Function for create ESMA Payload  
		 * @memberof adnoc.vi.vehicleinspection.modone.controller.ServiceTest
		 * @version 1.0.0
		 * @since 19.05.2025
		 * @fires event
		 * @author DK
		 */
		generateESMAResultPayload: function (aESMAData) {
			const oPayload = [];
			aESMAData.forEach(oParent => {
				const sMainTypeTextEnglish = oParent.testMainTypeTextEnglish;
				const sMainTypeTextArabic = oParent.testMainTypeTextArabic;
				const sTestMainTypeNo = oParent.testMainTypeNo;
				const sModifiedBy = sTestInspectedUserName;
				const sCreatedBy =  Formatter.getDateFromatIn_yyyyMMdd_HH_MM_SS(new Date());
				oPayload.push({
					testFlag: oParent.testFlag === true ? Constant.STATUS.YES : Constant.STATUS.NO,
					testMainTypeNo: sTestMainTypeNo,
					testMainTypeTextArabic: sMainTypeTextArabic,
					testMainTypeTextEnglish: sMainTypeTextEnglish,
					modifiedBy : sModifiedBy,
					createdBy : sCreatedBy

				});
			});
			const finalPayload = {
				applicableTestName: null,
				testComments: null,
				testInspectedBy: null,
				testInspectionEndDate: null,
				testInspectionStartDate: null,
				testStatus: null,
				testResultsESMAS: oPayload
			};
			return finalPayload;
		},

		/**
		 * This Function for Save ESMA Test Result 
		 * @memberof adnoc.vi.vehicleinspection.modone.controller.ServiceTest
		 * @version 1.0.0
		 * @since 19.05.2025
		 * @fires generateESMAResultPayload, getDateFromatIn_yyyyMMdd_HH_MM_SS ,deleteESMATestData,createNewModelUsingAPI,updateServiceTestModel,onBtnPressCloseESMA
		 * @author DK
		 */
		onBtnPressSaveESMATest: async function (oEvent) {
			let oButton = oEvent.getSource();
			let sfullId = oButton.getId();
			buttonId = sfullId.split("--").pop();
			let oReqModel = this.getView().getModel("ESMAListModel").getData().d.results;
			const aRequestPayload = this.generateESMAResultPayload(oReqModel);
			let sESMAVehicleGUID = '';
			let dFormattedDate = Formatter.getDateFromatIn_yyyyMMdd_HH_MM_SS(new Date())
			if (this.charStatusData && this.charStatusData.vehOrdInspLinesTestChars) {
				let aCharStatusList = this.charStatusData;
				const filteredResults = aCharStatusList.vehOrdInspLinesTestChars.results.filter(item => item.applicableTestName === Constant.TESTTYPE.ESMA);
				const vehicleOrderGuid = filteredResults.filter(item => item.applicableTestName === Constant.TESTTYPE.ESMA)
					.map(item => ({
						testUUID: item.VehicleOrderInspectionLinesTestCharUUID,
						testStatus: item.testStatus,
						applicableTestName: item.applicableTestName
					}));
				if (vehicleOrderGuid.length === 0) {
					MessageToast.show(this.oBundle.getText("esma_MessageTostForGuidNotFound"));
					return;
				}
				sESMAVehicleGUID = vehicleOrderGuid[0].testUUID;
				aRequestPayload.applicableTestName = vehicleOrderGuid[0].applicableTestName;
				aRequestPayload.testInspectedBy = sTestInspectedUserName;
				aRequestPayload.testComments = null;
				aRequestPayload.testInspectionStartDate = dFormattedDate;
				aRequestPayload.testInspectionEndDate = dFormattedDate;
				let status = aRequestPayload.testResultsESMAS.every(item => item.testFlag === Constant.STATUS.YES) ? Constant.STATUS.PASS : Constant.STATUS.FAIL;
				if ((vehicleOrderGuid[0].testStatus === Constant.STATUS.OPEN || vehicleOrderGuid[0].testStatus === Constant.STATUS.INPROGRESS) && buttonId !== Constant.BUTTONEVENT.BUTTONESMAID) {
					aRequestPayload.testStatus = Constant.STATUS.INPROGRESS
				} else if ((vehicleOrderGuid[0].testStatus === Constant.STATUS.OPEN || vehicleOrderGuid[0].testStatus === Constant.STATUS.INPROGRESS) && buttonId === Constant.BUTTONEVENT.BUTTONESMAID) {
					aRequestPayload.testStatus = status;
				} else {
					aRequestPayload.testStatus = vehicleOrderGuid[0].testStatus;
				}
			}
			else {
				MessageToast.show(this.oBundle.getText("esma_MessageTostForStatusNotFound"));
			}
			await this.deleteESMATestData(aRequestPayload, sESMAVehicleGUID);
			await this.createNewModelUsingAPI(
				'PATCH',
				`odata/v2/vehicleinspection/VehicleOrderInspectionLinesTestChar('${sESMAVehicleGUID}')`,
				aRequestPayload,
				'ESMASaveModel'
			);
			if (buttonId === Constant.BUTTONEVENT.BUTTONESMAID) {
				MessageToast.show(this.oBundle.getText("esma_MessageTostForConfirm"));
			}
			else {
				MessageToast.show(this.oBundle.getText("esma_MessageTostForSave"));
			}
			this.updateServiceTestModel();
			this.onBtnPressCloseESMA();
		},

		/**
		 * This Function for delete ESMS test result befor save
		 * @memberof adnoc.vi.vehicleinspection.modone.controller.ServiceTest
		 * @version 1.0.0
		 * @since 19.05.2025
		 * @fires createNewModelUsingAPI()
		 * @author Initials
		 */
		deleteESMATestData: async function (aRequestPayload, sESMAVehicleGUID) {
			const oPayload = {
				applicableTestName: aRequestPayload.applicableTestName,
				testComments: null,
				testInspectedBy: aRequestPayload.testInspectedBy,
				testInspectionEndDate: aRequestPayload.testInspectionEndDate,
				testInspectionStartDate: aRequestPayload.testInspectionStartDate,
				testStatus: aRequestPayload.testStatus,
				testResultsESMAS: null
			};
			await this.createNewModelUsingAPI(
				'PATCH',
				`odata/v2/vehicleinspection/VehicleOrderInspectionLinesTestChar('${sESMAVehicleGUID}')`,
				oPayload,
				'ESMAAfterDeleteModel'
			);
		},

		/**
		 * This function opens a message box to confirm with the user. If the user presses 'Yes', the test result is confirmed.
		 * @memberof adnoc.vi.vehicleinspection.modone.controller.ServiceTest
		 * @version 1.0.0
		 * @since 19.05.2025
		 * @fires onBtnPressSaveESMATest
		 * @author DK
		 */
		onBtnPressESMAConfirm(oEvent) {
			let oButton = oEvent.getSource();
			let sfullId = oButton.getId("ConfirmESMA_Id");
			buttonId = sfullId.split("--").pop();
			MessageBox.confirm(
				this.oBundle.getText("esma_MessageTostForUserConfirmation"), {
				icon: MessageBox.Icon.INFORMATION,
				title: this.oBundle.getText("esma_Titel"),
				class: "sapUiSizeCompact",
				actions: [MessageBox.Action.YES, MessageBox.Action.NO],
				onClose: function (oAction) {
					if (oAction === Constant.STATUS.YES) {
						this.onBtnPressSaveESMATest(oEvent);
					}
				}.bind(this)
			});
		},

		/**
		 * This function handles single or multiple checkbox selections. 
		 * @memberof adnoc.vi.vehicleinspection.modone.controller.ServiceTest
		 * @version 1.0.0
		 * @since 19.05.2025
		 * @fires onESMADialogOpened
		 * @author DK
		 */
		onCheckboxSelectESMATest: function (oEvent) {
			const oCheckBox = oEvent.getSource();
			const bSelected = oCheckBox.getSelected();
			const oContext = oCheckBox.getBindingContext("ESMAListModel");
			const oModel = this.getView().getModel("ESMAListModel");
			const aResults = oModel.getProperty("/d/results");
			let sProp = "";
			const aCustomData = oCheckBox.getCustomData();
			if (aCustomData && aCustomData.length) {
				const oPropData = aCustomData.find(cd => cd.getKey() === "prop");
				if (oPropData) {
					sProp = oPropData.getValue();
				}
			}
			if (!sProp) {
				MessageToast.show(this.oBundle.getText("esma_MessageTostWarningForCheckbox"));
				return;
			}
			if (sProp === "selectAll") {
				aResults.forEach((_, iIndex) => {
					oModel.setProperty(`/d/results/${iIndex}/testFlag`, bSelected);
				});
				oModel.setProperty("/d/results/0/selectAll", bSelected);
			} else if (sProp === "testFlag") {
				if (!oContext) {
					MessageToast.show(this.oBundle.getText("esma_MessageTostWarningForIndividualCheckbox"));
					return;
				}
				const sPath = oContext.getPath();
				oModel.setProperty(`${sPath}/testFlag`, bSelected);
				const bAllSelected = aResults.every(item => item.testFlag === true);
				this.onESMADialogOpened(bAllSelected);
				oModel.refresh(true);
			}
		},
		//#endregion

		// #region Permitregion

		/**
		* This function is get the Permit test result status
		* @memberof  adnoc.vi.vehicleinspection.modone.controller.ServiceTest
		* @version 1.0.0
		* @since 19.05.2025
		* @fires 
		* @author DK
		*/
		getPermitTestStatus: function () {
			const oStatusModel = this.getView().getModel('lUpdateModelServiceTestModel');
			const oStatusData = oStatusModel.getData();
			let sPermitVehicleGUID = '';
			let sPermitVehicle = [];
			const filteredResults = this.charStatusData?.vehOrdInspLinesTestChars?.results?.filter(
				item => item.applicableTestName === Constant.TESTTYPE.PERMIT
			);

			if (!filteredResults || filteredResults.length === 0) {
				return null;
			}

			sPermitVehicle = filteredResults.map(item => ({
				testUUID: item.VehicleOrderInspectionLinesTestCharUUID,
				testStatus: item.testStatus,
				applicableTestName: item.applicableTestName
			}));

			sPermitVehicleGUID = sPermitVehicle[0]?.testUUID;

			const matchingItems = oStatusData.results
				.flatMap(result => result.vehOrdInspLinesTestChars.results)
				.filter(item => item.VehicleOrderInspectionLinesTestCharUUID === sPermitVehicleGUID);

			return matchingItems[0];
		},

		/**
		 * This function is get the Permit Test Result 
		 * @memberof  adnoc.vi.vehicleinspection.modone.controller.ServiceTest
		 * @version 1.0.0
		 * @since 19.05.2025
		 * @fires getPermitSaveData , getPermitTestStatus, attachAfterOpen, getPermitSaveData ,createNewModelUsingAPI
		 * @author DK
		 */
		onPressBtnPressPermit: async function () {
			// oPermitfile = null;
			// let oPermitReEmbossedModel = this.getView().getModel('OverAllStatusGetModel').getData();
			// console.log(oPermitReEmbossedModel);

			// const testChars = oPermitReEmbossedModel.d.vehOrdInspLinesTestChars?.results || [];
			// const permitTest = testChars.find(item => item.applicableTestName === Constant.TESTTYPE.PERMIT);
			// const serviceTypeTextEng = permitTest?.testResultsPermits?.results?.[0]?.serviceTypeTextEng;
			// console.log(serviceTypeTextEng);  // Output: "300012"

			// var oCommentModel = new sap.ui.model.json.JSONModel({
			// 	testComments: null
			// });

			// await this.createNewModelUsingAPI('GET', 'odata/v2/vehicleinspection/BodyColorMasters', '', 'opencflBodyColorMasters');
			// await this.createNewModelUsingAPI('GET', 'odata/v2/vehicleinspection/VehicleTypeMasters', '', 'opencflPlateTypeMasters');
			// await this.createNewModelUsingAPI('GET', 'odata/v2/vehicleinspection/VehicleKindMasters', '', 'opencflKindMasters'),

			// 	this.getView().setModel(oCommentModel, "permitCommentModel");
			// let oPermitModel = this.getView().getModel("PermitResultSaveModel");

			// oPermitModel.setProperty("/serviceTypeCode", this.charStatusData.materialCode);
			// oPermitModel.setProperty("/serviceTypeName", this.charStatusData.materialName);
			// oPermitModel.setProperty("/serviceTypeTextEng", serviceTypeTextEng);
			// let sServiceTypeTextCode = oPermitModel.getProperty("/serviceTypeCode");
			// let sServiceTypeTextName = oPermitModel.getProperty("/serviceTypeName");

			// let sTestStatus = this.getPermitTestStatus();
			// if (sTestStatus.testStatus === Constant.STATUS.INPROGRESS || sTestStatus.testStatus === Constant.STATUS.COMPLETE) {
			// 	this.getPermitSaveData();
			// }

			if (!this.permitDialog) {
				this.permitDialog = sap.ui.xmlfragment("adnoc.vi.vehicleinspection.modone.fragment.view.Permit", this);
				this.getView().addDependent(this.permitDialog);
				this.permitDialog.attachAfterOpen(() => {
					this.onCheckServiceType();
				});
			}

			// if (sTestStatus.testStatus === null) {
			// 	MessageBox.warning(this.oBundle.getText("pertmit_MessageToastPermitTestNotApplicable"));
			// 	return
			// }

			// Optional: Set clean data to the model if needed
		//	if (sTestStatus.testStatus === Constant.STATUS.OPEN) {
				// let oModel = new sap.ui.model.json.JSONModel({}); // or actual fresh data
				// let oBlankData = {
				// 	"materialCode": "",
				// 	"materialLabelEng": "",
				// 	"materialLabelArabic": "",
				// 	"serviceTypeCode": sServiceTypeTextCode,
				// 	"serviceTypeName": sServiceTypeTextName,
				// 	"serviceTypeValue": "",
				// 	"serviceTypeTextEng": serviceTypeTextEng,
				// 	"serviceTypeTextArabic": "",
				// 	"companyType": "",
				// 	"companyName": "",
				// 	"serviceComments": "",
				// 	"representativeType": "",
				// 	"representativeId": "",
				// 	"idExpiryDate": "",
				// 	"idName": "",
				// 	"idImageNo_attachmentGuId": "30873528-79d1-4fc0-8920-471de04229c7",
				// 	"certificateType": "",
				// 	"certificateNo": "",
				// 	"certificateDate": "",
				// 	"certificateRef": "",
				// 	"Remarks": ""
				// };

				// let oModelPermit = this.getView().getModel("PermitResultSaveModel");
				// oModelPermit.setData(oBlankData);
				// this.getView().setModel(oModel, "ButtonVisibleModel");
			//}
			this.permitDialog.open();
		},

		/**
		 * This function close the Permit fragment
		 * @memberof  adnoc.vi.vehicleinspection.modone.controller.ServiceTest
		 * @version 1.0.0
		 * @since 19.05.2025
		 * @fires getPermitSaveData , getPermitTestStatus, attachAfterOpen, getPermitSaveData
		 * @author DK
		 */
		onClosePermit: function () {
			if (this.permitDialog) {
				this.permitDialog.close();
			}

		},

		/**
		 * This function generate Permit Result Payload 
		 * @memberof  adnoc.vi.vehicleinspection.modone.controller.ServiceTest
		 * @version 1.0.0
		 * @since 19.05.2025
		 * @fires convertToYYYYMMDD_String
		 * @author DK
		 */
		generatePermitResultPayload: function (aPermitData) {
			aPermitData.idExpiryDate = Formatter.convertToYYYYMMDD_String(aPermitData.idExpiryDate);
			aPermitData.certificateDate = Formatter.convertToYYYYMMDD_String(aPermitData.certificateDate);
			//delete aPermitData.	
			const oPayload = [];
			oPayload.push(aPermitData);


			const finalPayload = {
				applicableTestName: null,
				testComments: null,
				testInspectedBy: null,
				testInspectionEndDate: null,
				testInspectionStartDate: null,
				testStatus: null,
				testResultsPermits: oPayload
			};

			return finalPayload;
		},

		/**
		 * This function is Save the Permit test Result  
		 * @memberof  adnoc.vi.vehicleinspection.modone.controller.ServiceTest
		 * @version 1.0.0
		 * @since 19.05.2025
		 * @fires getDateFromatIn_yyyyMMdd_HH_MM_SS , onSaveAttachment, deletePermitTestData, createNewModelUsingAPI, patchAttachmentDataPermit, updateServiceTestModel
		 * @author DK
		 */
		onBtnPressSavePermitTest: async function () {
			let oCommentModel = this.getView().getModel("permitCommentModel").getData();

			let oReqModel = this.getView().getModel("PermitResultSaveModel").getData();
			localStorage.setItem("PermitResultSaveData", JSON.stringify(oReqModel));

			const aRequestPayload = this.generatePermitResultPayload(oReqModel);

			let sPermitVehicleGUID = '';
			let dCurrentDate = new Date();
			let dFormattedDate = Formatter.getDateFromatIn_yyyyMMdd_HH_MM_SS(dCurrentDate);
			if (this.charStatusData && this.charStatusData.vehOrdInspLinesTestChars) {

				let charStatusList = this.charStatusData;
				let vehicleOrderGuid = [];
				let filteredResults = [];

				filteredResults = charStatusList.vehOrdInspLinesTestChars.results.filter(item => item.applicableTestName === Constant.TESTTYPE.PERMIT);
				vehicleOrderGuid = filteredResults.filter(item => item.applicableTestName === Constant.TESTTYPE.PERMIT)
					.map(item => ({
						testUUID: item.VehicleOrderInspectionLinesTestCharUUID,
						testStatus: item.testStatus,
						applicableTestName: item.applicableTestName
					}));

				if (vehicleOrderGuid.length === 0) {
					console.error(this.oBundle.getText("pertmit_MessageToastVehicleOrderGuidNotfound"));
					return;
				}

				sPermitVehicleGUID = vehicleOrderGuid[0].testUUID;
				aRequestPayload.testComments = oCommentModel.testComments;
				aRequestPayload.applicableTestName = vehicleOrderGuid[0].applicableTestName;
				aRequestPayload.testInspectedBy = sTestInspectedUserName;
				aRequestPayload.testInspectionStartDate = dFormattedDate;
				aRequestPayload.testInspectionEndDate = dFormattedDate;

				if ((vehicleOrderGuid[0].testStatus === Constant.STATUS.OPEN || vehicleOrderGuid[0].testStatus === Constant.STATUS.INPROGRESS) && buttonId !== Constant.BUTTONEVENT.BUTTONPERMITID) {
					aRequestPayload.testStatus = Constant.STATUS.INPROGRESS
				} else if ((vehicleOrderGuid[0].testStatus === Constant.STATUS.OPEN || vehicleOrderGuid[0].testStatus === Constant.STATUS.INPROGRESS) && buttonId === Constant.BUTTONEVENT.BUTTONPERMITID) {
					aRequestPayload.testStatus = Constant.STATUS.COMPLETE
				} else {
					aRequestPayload.testStatus = vehicleOrderGuid[0].testStatus;
				}


			}
			else {
				console.log(this.oBundle.getText("pertmit_MessageToastCharStatusDataOrvehOrdInspLinesTestCharsUndefined"));
			}

			if ((oReqModel.idExpiryDate === '' || oReqModel.certificateDate === '' || oReqModel.representativeType === '' || oReqModel.representativeId === '' || oReqModel.serviceTypeTextEng === '' || oReqModel.certificateType === '' || oReqModel.idName === '')) {
				MessageToast.show(this.oBundle.getText("pertmit_MessageToastPleaseEnterMandatoryField"));
				return;
			}

			delete aRequestPayload.testResultsPermits[0].serviceTypeName;
			// console.log("Confirm Payload", aRequestPayload);
			if (oPermitfile != null) {
				await this.onSaveAttachment();
			}

			await this.deletePermitTestData(aRequestPayload, sPermitVehicleGUID);

			await this.createNewModelUsingAPI(

				'PATCH',
				`odata/v2/vehicleinspection/VehicleOrderInspectionLinesTestChar('${sPermitVehicleGUID}')`,
				aRequestPayload,
				'PermitSaveModel'
			);
			let oModel = this.getView().getModel('PermitSaveModel');
			let oData = oModel.getData();
			let oPermitModelData = new sap.ui.model.json.JSONModel(oData);
			let oPermitResData = this.getView().setModel(oPermitModelData, "PermitResDataModel");

			if (oPermitfile != null) {
				await this.patchAttachmentDataPermit();
			}

			// let oModel = this.getView().getModel('PermitSaveModel');
			// let oData = oModel.getData();
			if (buttonId === Constant.BUTTONEVENT.BUTTONPERMITID) {
				MessageToast.show(this.oBundle.getText("pertmit_MessageToastConfirmedSuccessfully"));
			}
			else {
				MessageToast.show(this.oBundle.getText("pertmit_MessageToastSavedSuccessfully"));
			}
			this.updateServiceTestModel();
			this.permitDialog.close();
		},

		/**
		 * This function is delete Permit Test Data 
		 * @memberof  adnoc.vi.vehicleinspection.modone.controller.ServiceTest
		 * @version 1.0.0
		 * @since 19.05.2025
		 * @fires createNewModelUsingAPI
		 * @author DK
		 */
		deletePermitTestData: async function (aRequestPayload, sPermitVehicleGUID) {
			const oPayload = {
				applicableTestName: aRequestPayload.applicableTestName,
				testComments: null,
				testInspectedBy: aRequestPayload.testInspectedBy,
				testInspectionEndDate: aRequestPayload.testInspectionEndDate,
				testInspectionStartDate: aRequestPayload.testInspectionStartDate,
				testStatus: aRequestPayload.testStatus,
				testResultsPermits: null
			};
			await this.createNewModelUsingAPI(
				'PATCH',
				`odata/v2/vehicleinspection/VehicleOrderInspectionLinesTestChar('${sPermitVehicleGUID}')`,
				oPayload,
				'PermitAfterDeleteModel'
			);
		},

		/**
		 * This function is Save Permit Test result after the conformation of user
		 * @memberof  adnoc.vi.vehicleinspection.modone.controller.ServiceTest
		 * @version 1.0.0
		 * @since 19.05.2025
		 * @fires onBtnPressSavePermitTest
		 * @author DK
		 */
		onBtnPressPermitConfirm(oEventGetId) {
			if (oPermitfile === null) {
				MessageToast.show(this.oBundle.getText("pertmit_MessageToastAttachmenMmandatory"));
				return; // Stop further execution if no attachment
			}
			var oButton = oEventGetId.getSource();

			var fullId = oButton.getId("ConfirmPermit_Id");
			buttonId = fullId.split("--").pop();


			sap.m.MessageBox.confirm(
				this.oBundle.getText("pertmit_MessageToastAreyousureyouwanttoConfirm"), {
				icon: sap.m.MessageBox.Icon.INFORMATION,
				title: "Fetching Data",
				class: "sapUiSizeCompact",
				actions: [sap.m.MessageBox.Action.YES, sap.m.MessageBox.Action.NO],
				onClose: function (oAction) {
					if (oAction === "YES") {
						if (oPermitfile === null) {
							MessageToast.show(this.oBundle.getText("pertmit_MessageToastAttachmentMandatory"));
						}
						this.onBtnPressSavePermitTest();

					}
				}.bind(this)
			});
		},

		/**
		 * This function is get Save Permit Test result data
		 * @memberof  adnoc.vi.vehicleinspection.modone.controller.ServiceTest
		 * @version 1.0.0
		 * @since 19.05.2025
		 * @fires createNewModelUsingAPI , convertV2ODataDateFormart_DD_MM_YYYY
		 * @author DK
		 */
		getPermitSaveData: async function () {
			let oStatusModel = this.getView().getModel('lUpdateModelServiceTestModel');
			let oStatusData = oStatusModel.getData();
			let sPermitVehicleGUID = '';
			const filteredResults = this.charStatusData.vehOrdInspLinesTestChars.results.filter(item => item.applicableTestName === Constant.TESTTYPE.PERMIT);
			const sPermitVehicle = filteredResults.filter(item => item.applicableTestName === Constant.TESTTYPE.PERMIT).map(item => ({
				testUUID: item.VehicleOrderInspectionLinesTestCharUUID,
				testStatus: item.testStatus,
				applicableTestName: item.applicableTestName
			}));

			sPermitVehicleGUID = sPermitVehicle[0].testUUID

			let matchingItems = oStatusData.results
				.flatMap(result => result.vehOrdInspLinesTestChars.results)
				.filter(item => item.VehicleOrderInspectionLinesTestCharUUID === sPermitVehicleGUID);
			testStatus = matchingItems[0].testStatus

			await this.createNewModelUsingAPI(
				"GET",
				`odata/v2/vehicleinspection/TestResultsPermit?$filter=vehicleOrderInspectionLinesTestChar_VehicleOrderInspectionLinesTestCharUUID eq '${sPermitVehicleGUID}'`,
				"",
				"TestResultPermitModel"
			);
			let testResultResponse = this.getView().getModel("TestResultPermitModel");
			let oDataTestResult = testResultResponse.getData().d.results;

			if (testStatus === Constant.STATUS.COMPLETE) {
				var oModel = new sap.ui.model.json.JSONModel({
					isButtonVisible: false,
					isControlEditable: false,
				});
			} else {
				var oModel = new sap.ui.model.json.JSONModel({
					isButtonVisible: true,
					isControlEditable: true,
				});
			}
			this.getView().setModel(oModel, "ButtonVisibleModel");
			let testTypeResponse = this.getView().getModel("PermitResultSaveModel");
			let testTypeResponseData = testTypeResponse.getData();

			console.log(testTypeResponseData);
			if (oDataTestResult[0] !== undefined) {
				testTypeResponseData.idExpiryDate = Formatter.convertV2ODataDateFormart_DD_MM_YYYY(oDataTestResult[0].idExpiryDate);
				testTypeResponseData.certificateDate = Formatter.convertV2ODataDateFormart_DD_MM_YYYY(oDataTestResult[0].certificateDate);
				testTypeResponseData.representativeType = oDataTestResult[0].representativeType;
				testTypeResponseData.representativeId = oDataTestResult[0].representativeId;
				testTypeResponseData.idName = oDataTestResult[0].idName;
				testTypeResponseData.materialTypeCode = oDataTestResult[0].materialTypeCode;
				testTypeResponseData.idImageNo_attachmentGuId = oDataTestResult[0].idImageNo_attachmentGuId;
				testTypeResponseData.materialTypeLabelEng = oDataTestResult[0].materialTypeLabelEng;
				testTypeResponseData.materialTypeLabelArabic = oDataTestResult[0].materialTypeLabelArabic;
				testTypeResponseData.serviceTypeValue = oDataTestResult[0].serviceTypeValue;
				testTypeResponseData.serviceTypeTextEng = oDataTestResult[0].serviceTypeTextEng;
				testTypeResponseData.serviceTypeTextArabic = oDataTestResult[0].serviceTypeTextArabic;
				testTypeResponseData.companyType = oDataTestResult[0].companyType;
				testTypeResponseData.companyName = oDataTestResult[0].companyName;
				testTypeResponseData.serviceComments = oDataTestResult[0].serviceComments;
				testTypeResponseData.representativeType = oDataTestResult[0].representativeType;
				testTypeResponseData.representativeId = oDataTestResult[0].representativeId;
				testTypeResponseData.certificateType = oDataTestResult[0].certificateType;
				testTypeResponseData.certificateNo = oDataTestResult[0].certificateNo;
				testTypeResponseData.certificateRef = oDataTestResult[0].certificateRef;
				testTypeResponseData.Remarks = oDataTestResult[0].Remarks;
				testTypeResponse.setData(testTypeResponseData);
				testTypeResponse.refresh(true);
			} else {
				const oPermitResultModel = new sap.ui.model.json.JSONModel({});
				this.getView().setModel(oPermitResultModel, "PermitResultSaveModel");
				testTypeResponse.refresh(true);
			}
		},

		/**
		 * This function is using for difrent type of CFL
		 * @memberof  adnoc.vi.vehicleinspection.modone.controller.ServiceTest
		 * @version 1.0.0
		 * @since 19.05.2025
		 * @fires 
		 * @author DK
		 */
		onCheckServiceType: async function () {
			let oViewModel = this.getView().getModel("viewModel");
			let oServiceModel = this.getView().getModel("PermitResultSaveModel");
			let oServiceData = oServiceModel.getData();

			if (this.charStatusData.materialName === Constant.MATERIALTYPENAME.CHANGECOLOR) {

				oViewModel.setProperty("/cflType", Constant.COLOR);
				this.getView().setVisible(true);

			} else if (this.charStatusData.materialName === Constant.MATERIALTYPENAME.CHANGECOLORANDREPAIR) {

				oViewModel.setProperty("/cflType", Constant.REPLACECOLOR);
				this.getView().setVisible(true);

			} else if (this.charStatusData.materialName === Constant.MATERIALTYPENAME.CHANGEVEHICLEKIND) {

				oViewModel.setProperty("/cflType", Constant.KIND);
				this.getView().setVisible(true);

			} else if (this.charStatusData.materialName === Constant.MATERIALTYPENAME.CHANGEREPLACEBODY) {

				oViewModel.setProperty("/cflType", Constant.BODY);
				this.getView().setVisible(true);

			} else if (this.charStatusData.materialName === Constant.MATERIALTYPENAME.CHANGECHASSIS) {

				oViewModel.setProperty("/cflType", Constant.CHASSIS);
				this.getView().setVisible(true);
			} else if (this.charStatusData.materialName === Constant.MATERIALTYPENAME.CHANGEREEMBOSSED) {

				oViewModel.setProperty("/cflType", Constant.REEMBOSSED);
				this.getView().setVisible(true);
			} else {
				return
			}

		},

		/**
		 * This function is open combobox for select EmiratesID and Passport
		 * @memberof  adnoc.vi.vehicleinspection.modone.controller.ServiceTest
		 * @version 1.0.0
		 * @since 19.05.2025
		 * @fires 
		 * @author DK
		 */
		onSelectResType: async function (oEvent) {
			let oComboBox = oEvent.getSource();
			let sSelectedKey = oComboBox.getSelectedKey();
			let oserModel = this.getView().getModel("PermitResultSaveModel");
			let oViewModel = this.getView().getModel("viewModel");
			oserModel.setProperty("/representativeType", sSelectedKey);

			if (sSelectedKey === "emirates") {
				oViewModel.setProperty("/showEmiratesID", true);
				oserModel.setProperty("/representativeId", "");
				this.getView().setVisible(true);
			} else {
				oViewModel.setProperty("/showEmiratesID", false);
				oserModel.setProperty("/representativeId", "");


			}
		},

		/**
		 * This function is open combobox for Select Certificate
		 * @memberof  adnoc.vi.vehicleinspection.modone.controller.ServiceTest
		 * @version 1.0.0
		 * @since 19.05.2025
		 * @fires 
		 * @author DK
		 */
		onSelectCertificateProcess: async function (oEvent) {
			let oComboBox = oEvent.getSource();
			let sSelectedKey = oComboBox.getSelectedKey();
			let sSelectedText = oComboBox.getSelectedItem()?.getText();
			let oserModel = this.getView().getModel("PermitResultSaveModel");
			oserModel.setProperty("/certificateType", sSelectedKey);
		},

		/**
		 * This function is 
		 * @memberof  adnoc.vi.vehicleinspection.modone.controller.ServiceTest
		 * @version 1.0.0
		 * @since 19.05.2025
		 * @fires 
		 * @author DK
		 */
		onSelectRepresentative: function () {
			let oComboBox = oEvent.getSource();
			let sSelectedKey = oComboBox.getSelectedKey();
			let sSelectedText = oComboBox.getSelectedItem()?.getText();
			let oserModel = this.getView().getModel("PermitResultSaveModel");
			oserModel.setProperty("/representativeType", sSelectedKey);
		},

		/**
		 * This function is open CFL for Color and get the data from BodyColorMasters 
		 * @memberof  adnoc.vi.vehicleinspection.modone.controller.ServiceTest
		 * @version 1.0.0
		 * @since 19.05.2025
		 * @fires createNewModelUsingAPI,setCflTitle,setCflDisplayColumns,setCflDataColumns,setCflValueAndDisplay,setCflSearchProperty,showCfl
		 * @author DK
		 */
		openCflForColor: async function () {
			await this.createNewModelUsingAPI(
				'GET',
				'odata/v2/vehicleinspection/BodyColorMasters',
				'',
				"bodyColorModel"
			);
			this.setCflTitle('Body Color List');
			this.setCflDisplayColumns(['Body Color Code', 'Body Color Name English', 'Body Color Name Arabic']);
			this.setCflDataColumns(['colorCode', 'bodyColorEnglish', 'bodyColorArabic']);
			this.setCflValueAndDisplay('/bodyColorEnglish', 'manufacturerEnglish', '', '');
			this.setCflSearchProperty('bodyColorEnglish');
			this.showCfl('colorId', "bodyColorModel", 'd/results', this.onClosecflForColour.bind(this));


		},

		/**
		 * This function is Close CFL for Color 
		 * @memberof  adnoc.vi.vehicleinspection.modone.controller.ServiceTest
		 * @version 1.0.0
		 * @since 19.05.2025
		 * @fires onClosecflForColour
		 * @author DK
		 */
		onClosecflForColour: function () {
			let oCategoryRes = this.getCflObject();
			let oCategorySetData = this.getView().getModel("PermitResultSaveModel");

			oCategorySetData.setProperty('/serviceTypeValue', oCategoryRes.colorCode);
			oCategorySetData.setProperty('/serviceTypeTextEng', oCategoryRes.bodyColorEnglish);
			oCategorySetData.setProperty('/serviceTypeTextArabic', oCategoryRes.bodyColorArabic);
		},

		/**
		 * This function is Open CFL for Vehicle Type Masters 
		 * @memberof  adnoc.vi.vehicleinspection.modone.controller.ServiceTest
		 * @version 1.0.0
		 * @since 19.05.2025
		 * @fires createNewModelUsingAPI,setCflTitle,setCflDisplayColumns,setCflDataColumns,setCflValueAndDisplay,setCflSearchProperty,showCfl
		 * @author DK
		 */
		openCflForBody: async function () {
			await this.createNewModelUsingAPI(
				'GET',
				'odata/v2/vehicleinspection/VehicleTypeMasters',
				'',
				"BodyModel"
			);
			this.setCflTitle('Type List');
			this.setCflDisplayColumns(['Type Code', 'Type Name English', 'Type Name Arabic']);
			this.setCflDataColumns(['typeCode', 'typeNameEnglish', 'typeNameArabic']);
			this.setCflValueAndDisplay('/bodyColorEnglish', 'manufacturerEnglish', '', '');
			this.setCflSearchProperty('bodyColorEnglish');
			this.showCfl('colorId', "BodyModel", 'd/results', this.onClosecflForBody.bind(this));


		},

		/**
		 * This function is Close CFL for Vehicle Type Masters 
		 * @memberof  adnoc.vi.vehicleinspection.modone.controller.ServiceTest
		 * @version 1.0.0
		 * @since 19.05.2025
		 * @fires 
		 * @author DK
		 */
		onClosecflForBody: function () {
			let oCategoryRes = this.getCflObject();
			let oCategorySetData = this.getView().getModel("PermitResultSaveModel");

			oCategorySetData.setProperty('/serviceTypeValue', oCategoryRes.typeCode);
			oCategorySetData.setProperty('/serviceTypeTextEng', oCategoryRes.typeNameEnglish);
			oCategorySetData.setProperty('/serviceTypeTextArabic', oCategoryRes.typeNameArabic);
		},

		/**
	 * This function is Open CFL for Vehicle Kind Masters 
	 * @memberof  adnoc.vi.vehicleinspection.modone.controller.ServiceTest
	 * @version 1.0.0
	 * @since 19.05.2025
	 * @fires createNewModelUsingAPI
	 * @author DK
	 */
		openCflForKind: async function () {

			await this.createNewModelUsingAPI(
				'GET',
				//'odata/v2/vehicleinspection/VehicleLookupConfiguration?$expand=vehicleKind',
				'odata/v2/vehicleinspection/VehicleKindMasters',
				'',
				"KindTypeModel"
			);
			this.setCflTitle('Kind Type List');
			this.setCflDisplayColumns(['Kind Code', 'Kind Name English', 'Kind Name Arabic']);
			this.setCflDataColumns(['kindCode', 'kindNameEnglish', 'kindNameArabic']);
			this.setCflValueAndDisplay('/kindNameEnglish', 'manufacturerEnglish', '', '');
			this.setCflSearchProperty('kindNameEnglish');
			this.showCfl('kindID', "KindTypeModel", 'd/results', this.onClosecflForKind.bind(this));

		},

		/**
		 * This function is Close CFL for Vehicle Kind Masters 
		 * @memberof  adnoc.vi.vehicleinspection.modone.controller.ServiceTest
		 * @version 1.0.0
		 * @since 19.05.2025
		 * @fires 
		 * @author DK
		 */
		onClosecflForKind: function () {

			let oCategoryRes = this.getCflObject();
			let oCategorySetData = this.getView().getModel("PermitResultSaveModel");
			oCategorySetData.setProperty('/serviceTypeTextEng', oCategoryRes.kindNameEnglish);
			oCategorySetData.setProperty('/serviceTypeTextArabic', oCategoryRes.kindNameArabic);
			oCategorySetData.setProperty('/serviceTypeValue', oCategoryRes.kindCode);

		},

		/**
		 * This function is Open Camera fragment for Capture Image 
		 * @memberof  adnoc.vi.vehicleinspection.modone.controller.ServiceTest
		 * @version 1.0.0
		 * @since 19.05.2025
		 * @fires 
		 * @author DK
		 */
		onCaptureImageForPermit: function () {
			const that = this;

			// Create camera dialog if not already created
			if (!this._cameraDialog) {
				this._cameraDialog = sap.ui.xmlfragment(this.getView().getId(), "adnoc.vi.vehicleinspection.modone.fragment.view.OpenCamera", this);
				this.getView().addDependent(this._cameraDialog);
			}

			// Reset image view
			const oImage = this.getView().byId("capturedImage_New");
			oImage.setSrc("");
			oImage.setVisible(false);
			const oTakePhotoButton = this.getView().byId("btnTakePhotoPermit");

			oTakePhotoButton.setEnabled(true)
			// Open dialog first
			this._cameraDialog.open();

			// Delay to ensure DOM elements are rendered
			setTimeout(async () => {
				that._stopCameraStream(); // Ensure old stream is stopped

				try {
					const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" }, audio: false });
					that._cameraStream = stream;

					const videoElement = document.getElementById("cameraStream");
					if (videoElement) {
						videoElement.srcObject = stream;
						videoElement.style.display = "block";
						videoElement.play();
					}
				} catch (err) {
					sap.m.MessageBox.error("Camera access error: " + err.message);
				}
			}, 500);
		},


		/**
		 * This function is Capture Image  
		 * @memberof  adnoc.vi.vehicleinspection.modone.controller.ServiceTest
		 * @version 1.0.0
		 * @since 19.05.2025
		 * @fires 
		 * @author DK
		 */
		onTakePhotoForPermit: async function () {
			const that = this;
			const videoElement = document.getElementById("cameraStream");
			const oImage = this.getView().byId("capturedImage_New");
			const oTakePhotoButton = this.getView().byId("btnTakePhotoPermit");

			if (!videoElement || !this._cameraStream) {
				sap.m.MessageToast.show("Camera is not ready.");
				return;
			}

			// Capture image
			const canvas = document.createElement("canvas");
			canvas.width = videoElement.videoWidth;
			canvas.height = videoElement.videoHeight;
			const ctx = canvas.getContext("2d");
			ctx.drawImage(videoElement, 0, 0, canvas.width, canvas.height);

			// Stop camera stream
			this._stopCameraStream();

			// Hide video, show image
			videoElement.srcObject = null;
			videoElement.style.display = "none";

			const imageData = canvas.toDataURL("image/png");
			oImage.setSrc(imageData);
			oImage.setVisible(true);

			oTakePhotoButton.setEnabled(false);

			// Create File object (if needed for upload)
			const blob = await new Promise(resolve => canvas.toBlob(resolve, "image/jpeg"));
			const filename = `captured_${Date.now()}_${Math.random().toString(36).substring(2, 8)}.jpg`;
			oPermitfile = new File([blob], filename, { type: "image/jpeg" });
			oPermitfile._source = "camera";
			
		},


		/**
		 * Functon for View File Dialog handler
		 * @memberof  adnoc.vi.vehicleinspection.modone.controller.ServiceTest
		 * @version 1.0.0
		 * @since 19.05.2025
		 * @fires 
		 * @author DK
		 */
		onViewFilePermit: async function (oEvent) {
			await this.onViewFileHandlerPermit(oEvent, "/Permit");
		},


		/**
		 * This function is get the attachment File
		 * @memberof  adnoc.vi.vehicleinspection.modone.controller.ServiceTest
		 * @version 1.0.0
		 * @since 19.05.2025
		 * @fires getPermitTestStatus, createNewModelUsingAPI , getApiResponseObject, displayAttachment
		 * @author DK
		 */
		onViewFileHandlerPermit: async function () {

			let sVehicleGUUIDRes = this.getPermitTestStatus();
			await this.createNewModelUsingAPI('GET', `odata/v2/vehicleinspection/VehicleOrderInspectionLinesTestChar('${sVehicleGUUIDRes.VehicleOrderInspectionLinesTestCharUUID}')?$expand=testResultsPermits`, '', 'AttachResponseModel');
			let oModelAttachRes = this.getView().getModel('AttachResponseModel').getData().d.testResultsPermits.results;

			if (!oModelAttachRes[0].idImageNo_attachmentGuId) {
				MessageToast.show(this.oBundle.getText("pertmit_MessageToastPleaseUploadtheAttachmentFirst"));
				return;
			}

			let payload = {
				"attachmentGuId": oModelAttachRes[0].idImageNo_attachmentGuId
			};
			await this.createNewModelUsingAPI("POST", "odata/v2/vehicleinspection/getAttachmentByGuid", payload, "viewAttachModel");
			let res = this.getApiResponseObject();

			if (res.success) {
				this.displayAttachment(res.object.d);
			} else {
				MessageBox.error(res.object.responseJSON.error.message.value);
			}
		},


		/**
		 * This function is Download attachment File
		 * @memberof  adnoc.vi.vehicleinspection.modone.controller.ServiceTest
		 * @version 1.0.0
		 * @since 19.05.2025
		 * @fires createNewModelUsingAPI , createNewModelUsingAPI , getApiResponseObject ,downloadAttachmentData
		 * @author DK
		 */
		onDownloadFileHandlerForPermit: async function () {

			let sVehicleGUUIDRes = this.getPermitTestStatus();
			console.log(sVehicleGUUIDRes)
			await this.createNewModelUsingAPI('GET', `odata/v2/vehicleinspection/VehicleOrderInspectionLinesTestChar('${sVehicleGUUIDRes.VehicleOrderInspectionLinesTestCharUUID}')?$expand=testResultsPermits`, '', 'AttachResponseModel');
			let oModelAttachRes = this.getView().getModel('AttachResponseModel').getData().d.testResultsPermits.results;


			if (!oModelAttachRes || !oModelAttachRes[0].idImageNo_attachmentGuId) {
				MessageToast.show(this.oBundle.getText("pertmit_MessageToastPleaseUploadtheAttachmentFirst"));
				return;
			}
			let payload = {
				"attachmentGuId": oModelAttachRes[0].idImageNo_attachmentGuId
			};
			await this.createNewModelUsingAPI(
				"POST",
				"odata/v2/vehicleinspection/getAttachmentByGuid",
				payload,
				"downloadAttachModel"
			);
			let res = this.getApiResponseObject();

			if (res.success) {
				this.downloadAttachmentData(res.object.d);
			} else {
				MessageToast.show(res.object.responseJSON.error.message.value);
			}
		},


		/**
		 * This function is Update the attachment data
		 * @memberof  adnoc.vi.vehicleinspection.modone.controller.ServiceTest
		 * @version 1.0.0
		 * @since 19.05.2025
		 * @fires createNewModelUsingAPI
		 * @author DK
		 */
		patchAttachmentDataPermit: async function () {
			let Files = [];
			let oSaveResModel = this.getView().getModel("PermitResDataModel");
			let oPermitResModel = this.getView().getModel('AttachmentResModel');

			let oAttchGUID = oPermitResModel.oData[0].attachmentGuId; // Attachments
			let resGUID = oSaveResModel.oData.d.VehicleOrderInspectionLinesTestCharUUID; // Your docGuid

			if (!resGUID) {
				MessageBox.error(this.oBundle.getText("pertmit_MessageToastVehicleOrderInspectionLinesTestCharUUIDMissing"));
				return;
			}

			let oPayload = {
				attachmentGuId: oAttchGUID,
				docGuid: resGUID
			};
			Files.push(oPayload);
			let updatePayload = { Files };
			console.log("Final PATCH Payload:", updatePayload);

			await this.createNewModelUsingAPI('POST', 'odata/v2/vehicleinspection/UpdateAttachmentByDocGuid', updatePayload, 'PatchResponseModel');
			let oModel = this.getView().getModel('PatchResponseModel');
			let oData = oModel.getData();

		},


		/**
		 * This function is create payload for Attachment
		 * @memberof  adnoc.vi.vehicleinspection.modone.controller.ServiceTest
		 * @version 1.0.0
		 * @since 19.05.2025
		 * @fires _readFileAsBase64Multiple
		 * @author DK
		 */
		onSavePayloadforAttch: async function (ofile) {

			let base64 = await new Promise((resolve) => {
				this._readFileAsBase64Multiple(ofile, resolve);
			});

			let Files = [{
				attachmentGuId: null,
				attachmentName: ofile.name,
				orgFileName: ofile.name.split('.', 1)[0],
				orgFileExtension: ofile.name.split('.').pop(),
				docType: null,
				docId: null,
				docGuid: null,
				base64File: base64
			}];
			var oattchmentData = new sap.ui.model.json.JSONModel(Files);
			let oAttachment = this.getView().setModel(oattchmentData, "AttachmentPayloadModel");
			MessageToast.show(this.oBandle.getText("pertmit_MessageToastImageCapturedSuccessfully"));


		},


		/**
		 * This function is Save Attachment
		 * @memberof  adnoc.vi.vehicleinspection.modone.controller.ServiceTest
		 * @version 1.0.0
		 * @since 19.05.2025
		 * @fires createNewModelUsingAPI 
		 * @author DK
		 */
		onSaveAttachment: async function () {
			let Files = [];
			let oAttachmentData = this.getView().getModel('AttachmentPayloadModel').getData();
			let oPayload = oAttachmentData[0];
			Files.push(oPayload);

			let finalPayload = { Files };
			await this.createNewModelUsingAPI(
				'POST',
				'odata/v2/vehicleinspection/uploadAttachment',
				finalPayload,
				'AttachmentModel'
			);

			let oModel = this.getView().getModel('AttachmentModel');
			let oData = oModel.getData();
			let lAttachmentData = oData.d?.results || [];
			let oAttacment = this.getView().getModel('PermitResultSaveModel');
			oAttacment.setProperty("/idImageNo_attachmentGuId", lAttachmentData[0].attachmentGuId)

			var oAttchmentResData = new sap.ui.model.json.JSONModel(lAttachmentData);
			let oAttachment = this.getView().setModel(oAttchmentResData, "AttachmentResModel");
			//MessageToast.show("Image captured and uploaded successfully!");

		},


		/**
		 * This function 
		 * @memberof  adnoc.vi.vehicleinspection.modone.controller.ServiceTest
		 * @version 1.0.0
		 * @since 19.05.2025
		 * @fires 
		 * @author DK
		 */
		openBodyColor: function (oEventOut) {
			const oSelectedRow = oEventOut.getParameter("selectedRow");
			const oInput = oEventOut.getSource();
			const oBindingInfo = oInput.getBindingInfo("suggestionRows");
			const sModelName = oBindingInfo.model;
			const oCategoryRes = oSelectedRow.getBindingContext(sModelName).getObject();
			const oValueBindingInfo = oInput.getBindingInfo("value");
			const pModelName = oValueBindingInfo.parts[0].model;
			let oCategorySetData = this.getView().getModel(pModelName);

			oCategorySetData.setProperty('/serviceTypeValue', oCategoryRes.colorCode);
			oCategorySetData.setProperty('/serviceTypeTextEng', oCategoryRes.bodyColorEnglish);
			oCategorySetData.setProperty('/serviceTypeTextArabic', oCategoryRes.bodyColorArabic);
			return false;
		},


		/**
		 * This function is Expiry Date Input Blocked
		 * @memberof  adnoc.vi.vehicleinspection.modone.controller.ServiceTest
		 * @version 1.0.0
		 * @since 19.05.2025
		 * @fires 
		 * @author DK
		 */
		onExpiryDateInputBlocked: function (oEventExpiryDateValidation) {

			oEventExpiryDateValidation.preventDefault();
			oEventExpiryDateValidation.getSource().setValue("");
		},


		/**
		 * This function is validate to Past Date is not allowed 
		 * @memberof  adnoc.vi.vehicleinspection.modone.controller.ServiceTest
		 * @version 1.0.0
		 * @since 19.05.2025
		 * @fires 
		 * @author DK
		 */
		onExpiryDateChange: function (oEventEDCValidate) {
			let oDatePicker = oEventEDCValidate.getSource();
			let oSelectedDate = oDatePicker.getDateValue();
			let oToday = new Date();
			oToday.setHours(0, 0, 0, 0);

			if (oSelectedDate && oSelectedDate < oToday) {
				oDatePicker.setValueState("Error");
				oDatePicker.setValueStateText(this.oBandle.getText("pertmit_MessageToastPastDateNotAllowed"));
				oDatePicker.setValue("");
			} else {
				oDatePicker.setValueState("None");
				oDatePicker.setValueStateText("");
			}
		},


		/**
		 * This function validate the Name property is only string   
		 * @memberof  adnoc.vi.vehicleinspection.modone.controller.ServiceTest
		 * @version 1.0.0
		 * @since 19.05.2025
		 * @fires 
		 * @author DK
		 */
		onNameInputLiveChange: function (oEventForNameValidation) {
			let sValue = oEventForNameValidation.getParameter("value");
			let sValidValue = sValue.replace(/[^a-zA-Z\s]/g, '');

			if (sValue !== sValidValue) {
				oEventForNameValidation.getSource().setValue(sValidValue);
			}
		},


		/**
		 * This function is validate Certificate Number is Integer only 
		 * @memberof  adnoc.vi.vehicleinspection.modone.controller.ServiceTest
		 * @version 1.0.0
		 * @since 19.05.2025
		 * @fires 
		 * @author DK
		 */
		onCertificateNoInputLiveChange: function (oEventForCertificateNoValidation) {
			let sValue = oEventForCertificateNoValidation.getParameter("value");
			let sValidValue = sValue.replace(/\D/g, '');
			oEventForCertificateNoValidation.getSource().setValue(sValidValue);
		},

		/**
		 *  This function is auto search functionality and set the typeCode typeNameEnglish and typeNameArabic 
		 * @memberof  adnoc.vi.vehicleinspection.modone.controller.ServiceTest
		 * @version 1.0.0
		 * @since 19.05.2025
		 * @fires 
		 * @author DK
		 */
		openBodySelect: function (oEventOut) {
			const oSelectedRow = oEventOut.getParameter("selectedRow");
			const oInput = oEventOut.getSource();
			const oBindingInfo = oInput.getBindingInfo("suggestionRows");
			const sModelName = oBindingInfo.model;
			const oCategoryRes = oSelectedRow.getBindingContext(sModelName).getObject();
			const oValueBindingInfo = oInput.getBindingInfo("value");
			const pModelName = oValueBindingInfo.parts[0].model;
			let oCategorySetData = this.getView().getModel(pModelName);

			oCategorySetData.setProperty('/serviceTypeValue', oCategoryRes.typeCode);
			oCategorySetData.setProperty('/serviceTypeTextEng', oCategoryRes.typeNameEnglish);
			oCategorySetData.setProperty('/serviceTypeTextArabic', oCategoryRes.typeNameArabic);


			return false;
		},


		/**
		 * This function is auto search functionality and set the kindCode kindNameEnglish and kindNameArabic 
		 * @memberof  adnoc.vi.vehicleinspection.modone.controller.ServiceTest
		 * @version 1.0.0
		 * @since 19.05.2025
		 * @fires 
		 * @author DK
		 */
		onSelectKind: function (oEventOut) {
			const oSelectedRow = oEventOut.getParameter("selectedRow");
			const oInput = oEventOut.getSource();
			const oBindingInfo = oInput.getBindingInfo("suggestionRows");
			const sModelName = oBindingInfo.model;
			const oCategoryRes = oSelectedRow.getBindingContext(sModelName).getObject();
			const oValueBindingInfo = oInput.getBindingInfo("value");
			const pModelName = oValueBindingInfo.parts[0].model;
			let oCategorySetData = this.getView().getModel(pModelName);


			// let oCategoryRes = this.getCflObject();
			// let oCategorySetData = this.getView().getModel("PermitResultSaveModel");

			oCategorySetData.setProperty('/serviceTypeTextEng', oCategoryRes.kindNameEnglish);
			oCategorySetData.setProperty('/serviceTypeTextArabic', oCategoryRes.kindNameArabic);
			oCategorySetData.setProperty('/serviceTypeValue', oCategoryRes.kindCode);


			return false;
		},


		/**
		 * This function is stop the Camera Stream
		 * @memberof  adnoc.vi.vehicleinspection.modone.controller.ServiceTest
		 * @version 1.0.0
		 * @since 19.05.2025
		 * @fires 
		 * @author DK
		 */
		_stopCameraStream: function () {
			if (this.stream) {
				this.stream.getTracks().forEach(track => track.stop());
				this.stream = null;
			}
		},


		/**
		 * This function is Save attchment after accept and Close Camera Dialog
		 * @memberof  adnoc.vi.vehicleinspection.modone.controller.ServiceTest
		 * @version 1.0.0
		 * @since 19.05.2025
		 * @fires onSavePayloadforAttch, onCloseCameraDialog
		 * @author DK
		 */
		onAccept: function () {

			this.onSavePayloadforAttch(oPermitfile);
			this.onCloseCameraDialog();

		},


		/**
		 * This function is Recapture Image 
		 * @memberof  adnoc.vi.vehicleinspection.modone.controller.ServiceTest
		 * @version 1.0.0
		 * @since 19.05.2025
		 * @fires 
		 * @author DK
		 */
		onRecapturePhoto: async function () {
			const that = this;
			const oImage = this.getView().byId("capturedImage_New");
			const videoElement = document.getElementById("cameraStream");
			const oTakePhotoButton = this.getView().byId("btnTakePhotoPermit");
			// Hide image, clear source
			oImage.setVisible(false);
			oImage.setSrc("");
			oTakePhotoButton.setEnabled(true);

			// Stop existing stream
			this._stopCameraStream();

			try {
				const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" }, audio: false });
				this._cameraStream = stream;

				if (videoElement) {
					videoElement.srcObject = stream;
					videoElement.style.display = "block";
					videoElement.play();
				}
			} catch (err) {
				sap.m.MessageBox.error("Camera access error: " + err.message);
			}
		},


		/**
		 * This function is Download the Capture Image
		 * @memberof  adnoc.vi.vehicleinspection.modone.controller.ServiceTest
		 * @version 1.0.0
		 * @since 19.05.2025
		 * @fires onDownloadFileHandler
		 * @author DK
		 */
		onDownloadPermitTest: async function (oEvent) {
			await this.onDownloadFileHandler(oEvent, "/Permit");
		},

		//#endregion

		//#region Printregion
		/**
	 * To show the service test in pdf format
	 * @memberof adnoc.vi.vehicleinspection.modone.controller.ServiceTest
	 * @version 1.0.0
	 * @since 19.05.2025
	 * @fires createNewModelUsingAPI
	 * @author RK
	 */
		onBtnPressPrint: async function () {
			let aLineData = this.charStatusData;
			await this.createNewModelUsingAPI(
				'GET',
				`odata/v2/vehicleinspection/VehicleOrderInspectionLines('${this.charStatusData.vehicleOrderInspectionLines}')`,
				'',
				'VehicleOrderInspectionLinesModel'
			);
			aLineData.attachmentGuId_attachmentGuId =this.getView().getModel('VehicleOrderInspectionLinesModel').getData().d.attachmentGuId_attachmentGuId;
         

			let sSalesOrderLineNo = aLineData.orderLineNo.toString();
			let sAttachmentGuId = aLineData.attachmentGuId_attachmentGuId;
			let sVehicleOrderInspectionLinesUUID = aLineData.vehicleOrderInspectionLines;
			let sSerReqNo = aLineData.VehicleDetails.serviceRequestNo;
			let iPlateNo = aLineData.VehicleDetails.plateNumber;
			let sChasisNumber = aLineData.VehicleDetails.chasisNumber;
			let sApplicabelReportName; //

			if (aLineData && aLineData.vehOrdInspLinesTestChars && Array.isArray(aLineData.vehOrdInspLinesTestChars.results)) {
				aLineData.vehOrdInspLinesTestChars.results.forEach(function (item) {

					switch (item.applicableTestName) {
						case Constant.TESTTYPE.COMPREHENSIVE:
							sApplicabelReportName = Constant.TESTTYPE.COMPREHENSIVE;
							break;
						case Constant.TESTTYPE.TRAFFIC:
							sApplicabelReportName = Constant.TESTTYPE.TRAFFIC;
							break;
						case Constant.TESTTYPE.ESMA:
							sApplicabelReportName = Constant.TESTTYPE.ESMA;
							break;
						case Constant.TESTTYPE.PERMIT:
							sApplicabelReportName = Constant.TESTTYPE.PERMIT;
							break;
						case Constant.TESTTYPE.VEHICLE_CERTIFICATE:
                            sApplicabelReportName = Constant.TESTTYPE.VEHICLE_CERTIFICATE;
                            break;
					}
				});
			}

			let reqBodyPrint = {
				"attachmentGuId": sAttachmentGuId || null,
				"serviceRequestNo": sSerReqNo,
				"plateNo": iPlateNo,
				"chasisNumber": sChasisNumber,
				"testName": sApplicabelReportName,
				"orderLineNo": sSalesOrderLineNo,
				"vehicleOrderInspectionLines": sVehicleOrderInspectionLinesUUID

			}
			await this.createNewModelUsingAPI(
				'POST',
				'odata/v2/vehicleinspection/previewTestCertificate',
				reqBodyPrint,
				'printResponse'
			);

			let oResPrint = this.getView().getModel("printResponse");
			let aResDataPrint = oResPrint.getData();
			let sBase64 = aResDataPrint.d.previewTestCertificate.base64PDF;



			const oViewPrint = this.getView();
			const sBase64PDF = "data:application/pdf;base64," + sBase64;
			if (!this.byId("printDialogId")) {
				Fragment.load({
					id: oViewPrint.getId(),
					name: "adnoc.vi.vehicleinspection.modone.fragment.view.PrintDialog",
					controller: this
				}).then(function (oDialog) {
					oViewPrint.addDependent(oDialog);

					const iframeHTML = `
											<iframe 
												  src="${sBase64PDF}" 
												  style="border:none; width:100%; height:100%;"
											>
											</iframe>`;

					oDialog.getContent()[0].getItems()[0].setContent(iframeHTML);
					oDialog.open();
				});
			} else {
				const oDialog = this.byId("printDialogId");
				const iframeHTML = `
					<iframe 
					  src="${sBase64PDF}" 
					  width="100%" 
					  height="100%" 
					  style="border:none;"
					></iframe>`;
				oDialog.getContent()[0].getItems()[0].setContent(iframeHTML);
				oDialog.open();
			}
		},
		/**
		 * Close to Open PDf
		 * @memberof adnoc.vi.vehicleinspection.modone.controller.ServiceTest
		 * @version 1.0.0
		 * @since 19.05.2025
		 * @fires 
		 * @author RK
		 */
		onBtnPressClosePrint: function () {
			this.byId("printDialogId").close();
		},
		//#endregion

		onBtnPressVisualTest: function () {
			var oRouter = this.getOwnerComponent().getRouter();
			oRouter.navTo("InspectionTemp", false)
		},

		onBtnPressMahaTest: async function (oEvent) {
			let oModel = this.getView().getModel("lServiceTestModel");
			let res = oModel.getData();

			let resLineNum = this.mahaData;
			// let maha = res.VI_MAHA_TEST;
			// let mahaStatus = res.VI_MAHA_TEST_Status;
			var oModel1 = this.getOwnerComponent().getModel("SericeTestModel");
			let dataUodate = oModel1.getData();

			delete res.VehicleDetails.registrationExpiryDate;

			// let lineLength = res.VehicleOrderInspectionLines.length;
			let fileName = `${res.plantCode}_${dataUodate.serviceRequestNo}_${resLineNum.orderLineNo}`;

			let mahaPayload = {
				VehicleDetails: res.VehicleDetails,
				plantCode: res.plantCode,
				orderNo: dataUodate.serviceRequestNo,
				orderLineNo: resLineNum.orderLineNo

			}

			await this.createNewModelUsingAPI(
				'POST',
				'odata/v2/vehicleinspection/MahaEsInGenerate',
				mahaPayload,
				'FreshTestServiceModel'
			);

			let oFreshModel = this.getView().getModel("FreshTestServiceModel");

			let responseFreshModel = oFreshModel.getData();

			if (responseFreshModel.d.results) {
				MessageToast.show(`Maha File ${fileName} Generated Successfully`);
			}
		},

		_readFileAsBase64Multiple: function (file, callback) {

			const reader = new FileReader();
			reader.onload = function (event) {
				const base64String = event.target.result.split(",")[1]; // Get Base64 part of the string
				callback(base64String);
			};
			reader.onerror = function (error) {
				console.error("Error reading file as Base64:", error);
				sap.m.MessageToast.show("Error reading file: " + file.name);
			};
			reader.readAsDataURL(file); // Read file as Data URL

		},

		onMahaESINToastMessage: async function (aData) {
			if (this.isToastMsg) {
				let aMessage = "";

				aData.d.VehOrdInspDetails.results.forEach(order => {
					order.vehOrdInspLines.results.forEach(line => {
						if (line.materialType === "ZVTS") {
							line.vehOrdInspLinesTestChars.results.forEach(testChar => {
								if (testChar.applicableTestName === "ES_IN" && testChar.testStatus === "OPEN") {
									testChar.testResMahaFileDtls.results.forEach(mahaFile => {
										if (mahaFile.isError === true) {
											aMessage += `Plate No - ${order.plateNumber} ,Material Code -${line.materialCode}  ${mahaFile.errorDesc}\n`;
										}
									});
								}
							});
						}
					});
				});

				if (aMessage == "") {
					return;
				}
				MessageToast.show(aMessage, {
					width: "100rem"
				});

				return false;
			}

		}

	});
});