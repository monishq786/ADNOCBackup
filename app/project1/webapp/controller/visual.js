/**
* Services Controller 
* This Controller used visual and smart form
* @author Afshan (MA)
* @date 15.12.2025
*/
sap.ui.define([
	'adnoc/vi/vehicleinspection/core/generic/genericentryform',
	"sap/ui/core/UIComponent",
	"sap/m/MessageBox",
	"sap/ui/model/json/JSONModel",
	'sap/ui/core/Fragment',
	'sap/m/MessageToast',
	'adnoc/vi/vehicleinspection/modone/constants/Constant',
	'sap/m/Dialog',
	'adnoc/vi/vehicleinspection/modone/constants/ControlIds',
	'adnoc/vi/vehicleinspection/modone/formatter/Formatter',
	'adnoc/vi/vehicleinspection/modone/fragment/controller/FRGESMATest_V2Controller',
	'adnoc/vi/vehicleinspection/modone/fragment/controller/FRGTrafficTestController',
	'adnoc/vi/vehicleinspection/modone/fragment/controller/FRGModifiedVehicleController',
], function (genericentryform, UIComponent, MessageBox, JSONModel, Fragment, MessageToast, Constant, Dialog, ControlIds, Formatter) {
	"use strict";
	let oParentPayLoad = [];
	let oVisualfile;
	var aClickedButton = [];
	let SideButtonsHolder = []; ''
	let aCreatePayload
	let aAttachmentPayload = [];
	let aPreviousAttachment = [];
	let oSetSubcategory = [];
	return genericentryform.extend("adnoc.vi.vehicleinspection.modone.controller.VisualInspection", {

		/**Executes during controller initialization (onInit).
		* @memberof adnoc.vi.vehicleinspection.modone.controller.VisualInspection
		* @version 1.0.0
		* @since 01.01.2025
		* @author MA
		* @fires 
		*/
		onInit: function () {
			genericentryform.prototype.onInit.apply(this, arguments);
		},

		/**Handles initialization and triggers functions in onBeforeShow lifecycle 
		* @memberof adnoc.vi.vehicleinspection.modone.controller.VisualInspection
		* @version 1.0.0
		* @since 01.01.2025
		* @author MA
		* @fires 
		*/
		onBeforeShow: async function () {
			this.onLoadHideTab();
			this.initialize();
		},

		/**Function for Initilization for Generic Required Function
		* @memberof adnoc.vi.vehicleinspection.modone.controller.VisualInspection
		* @version 1.0.0
		* @since 01.01.2025
		* @author MA
		* @fires 
		*/
		initialize: async function () {
			this.oi18nModel = this.getView().getModel("i18n").getResourceBundle();
			this._oRouter = sap.ui.core.UIComponent.getRouterFor(this);
			var Model = new JSONModel({ selectedValue: "" });
			this.getView().setModel(Model, "VisualInitializeModel");
			let bIsApplicable = await this.VisualTabValidation();
			this.byId(ControlIds.VISUAL_ID.TabBarHeaderId).setSelectedKey(ControlIds.VISUAL_ID.VisualTabtab1);
			if (bIsApplicable) { this.onLoadMatchedData(); }
			this.onTabsPressSmartFormVisual();
			this.byId(ControlIds.VISUAL_ID.CHECKBOXSUBCATEGORY).setEnabled(true);
			this.byId(ControlIds.VISUAL_ID.EDITBUTTON).setEnabled(true);
			this.oEmployeeData = Formatter.onLoadGetDataInSessionStorage('BusinessData');
			var oTextMainType = this.byId(ControlIds.VISUAL_ID.txtMainTypeMsg);
			oTextMainType.setText('');
		},

		/**Function use for get previous data 
		* @memberof adnoc.vi.vehicleinspection.modone.controller.VisualInspection
		* @version 1.0.0
		* @since 01.01.2025
		* @author MA
		* @fires 
		*/
		onLoadMatchedData: function (oEvent) {
			this.oParentPayLoad = [];
			let oVisualInitializeModel = this.getView().getModel("VisualInitializeModel");
			let oVIRGlobalModel = this.getView().getModel("VIRGlobalModel");
			if (oVisualInitializeModel) {
				oVisualInitializeModel.setProperty("/LinesDefect", "");
				oVisualInitializeModel.setProperty("/isSaved", false);
				if (oVIRGlobalModel) {
					let oVisualServiceItems = oVIRGlobalModel.getProperty('/UpdatedDataModel').VehOrdInspDetails.results[0].vehOrdInspLines.results.filter(x => x.VI_VISUAL_TEST == 'Visual');
					let oCurrentInspection = oVIRGlobalModel.getProperty("/CurrentInspection");
					oVisualInitializeModel.setProperty("/materialCode", oVisualServiceItems.find(x => x.materialName == oCurrentInspection)?.materialCode);
					oVisualInitializeModel.setProperty("/materialName", oCurrentInspection);
					oVisualInitializeModel.setProperty("/surajService", oVisualServiceItems);
					this.MainDefectCategoryLoad();
					oVisualServiceItems.forEach(function (item, index) {
						if (item.VI_VISUAL_TEST_Status == Constant.STATUS.INPROGRESS)
							item.highlight = Constant.MESSAGESTATUS.MESSAGESUCCESS;
						else if (item.VI_VISUAL_TEST_Status == Constant.STATUS.PASS || item.VI_VISUAL_TEST_Status == Constant.STATUS.FAIL)
							item.highlight = Constant.MESSAGESTATUS.MESSAGESUCCESS;
					});
					//find the Current MMaterial name from
					let oSelectedMaterial = oVisualServiceItems.find(x => x.materialName == oCurrentInspection);

					/*Check If Line Confirm The Save and confirm button Hide*/
					if (oSelectedMaterial.VI_VISUAL_TEST_Status == Constant.STATUS.PASS || oSelectedMaterial.VI_VISUAL_TEST_Status == Constant.STATUS.FAIL) {
						this.byId(ControlIds.VISUAL_ID.SAVEBUTTON).setVisible(false);
						this.byId(ControlIds.VISUAL_ID.BUTTONCONFIRM).setVisible(false);
						this.byId(ControlIds.VISUAL_ID.CHECKBOXSUBCATEGORY).setEnabled(false);
						this.byId(ControlIds.VISUAL_ID.EDITBUTTON).setEnabled(false);
						this.byId(ControlIds.VISUAL_ID.UPLOADFILEBTNID).setVisible(true);
						oSelectedMaterial.highlight = Constant.MESSAGESTATUS.MESSAGESUCCESS;
					}
					else if (oSelectedMaterial.VI_VISUAL_TEST_Status == Constant.STATUS.INPROGRESS) {
						oSelectedMaterial.highlight = Constant.MESSAGESTATUS.MESSAGESUCCESS;
						this.byId(ControlIds.VISUAL_ID.UPLOADFILEBTNID).setVisible(false);
					}
					else {
						this.byId(ControlIds.VISUAL_ID.UPLOADFILEBTNID).setVisible(false);
						oSelectedMaterial.highlight = Constant.INFORMATION;
					}
					oVIRGlobalModel.refresh();
				} else {
					return
				}
			} else {
				return;
			}
		},

		// -----------------------------
		// onTabsPressSmartFormVisual
		// -----------------------------
		/**Function use for Show Smart form tab
		* @memberof adnoc.vi.vehicleinspection.modone.controller.VisualInspection
		* @version 1.0.0
		* @since 01.01.2025
		* @author MA
		* @fires 
		*/
		onTabsPressSmartFormVisual: async function (oEvent) {
			const sKey = oEvent ? oEvent.getParameter("key") : this.byId(ControlIds.VISUAL_ID.TabBarHeaderId).getSelectedKey();
			// Show tab1 layout
			this.byId(ControlIds.VISUAL_ID.VboxflexContainerId).setVisible(sKey === ControlIds.VISUAL_ID.VisualTabtab1);
			this.VisualTabValidation();
			const tabFragmentMap = Constant.SmartFormTab;
			const tabInfo = tabFragmentMap[sKey];
			if (!tabInfo) return;

			// Destroy old fragment to avoid duplicates
			if (this[`_oFragment_${sKey}`]) {
				this[`_oFragment_${sKey}`].destroy(true);
				delete this[`_oFragment_${sKey}`];
				delete this[`_fragmentController_${sKey}`];
			}

			// Attach all required models
			const oModels = {
				aOrderProcessingModel: this.getOwnerComponent().getModel("aOrderProcessingModelBase"),
				ESMASaveModel: this.getView().getModel("ESMASaveModel"),
				ShowModel: this.getView().getModel("ShowModel"),
				ComModel: this.getView().getModel("ComModel"),
				aComprehensiveModel: this.getView().getModel("aComprehensiveModel"),
				TrafficModel: this.getView().getModel("TrafficModel"),
				oGlobalModel: this.getView().getModel("oGlobalModel"),
				FileUploadedModel: this.getView().getModel("FileUploadedModel"),
				TrafficAttachFileModel: this.getView().getModel("TrafficAttachFileModel")
			};

			//Load fragment using safe loader
			try {
				const ControllerClass = sap.ui.requireSync(tabInfo.controllerModulePath);
				const oControllerInstance = new ControllerClass();

				const result = await this._loadFragmentFlexible(
					tabInfo.fragmentName,
					oControllerInstance,
					{
						containerId: tabInfo.containerId,
						storeController: true,
						models: oModels
					}
				);

				if (!result || !result.root) {
					return;
				}

				this[`_oFragment_${sKey}`] = result.root;
				this[`_fragmentController_${sKey}`] = result.controller;

			} catch (err) {
				return;
			}

			// Refresh fragment data
			const fragController = this[`_fragmentController_${sKey}`];
			if (fragController && typeof fragController[tabInfo.refreshMethod] === "function") {
				await fragController[tabInfo.refreshMethod]();
			}
		},


		// -----------------------------
		// _loadFragmentFlexible
		// -----------------------------

		/**Function use for visual smart tab
		* @memberof adnoc.vi.vehicleinspection.modone.controller.VisualInspection
		* @version 1.0.0
		* @since 01.01.2025
		* @author MA
		* @fires 
		*/
		_loadFragmentFlexible: async function (sFragmentName, oControllerInstance, options = {}) {
			try {
				// Generate unique prefix for this fragment instance
				const fragmentIdPrefix = options.fragmentIdPrefix || `${options.containerId || 'frag'}_${new Date().getTime()}`;

				// Load fragment
				const oFragment = await Fragment.load({
					name: sFragmentName,
					controller: oControllerInstance,
					id: fragmentIdPrefix
				});

				const aControls = Array.isArray(oFragment) ? oFragment : [oFragment];
				let oRootControl = null;

				for (const oControl of aControls) {
					oRootControl = oControl;

					if (options.asDialog) {
						const oDialog = new sap.m.Dialog({
							title: options.dialogTitle || "{i18n>DialogTitle}",
							content: [oControl],
							stretch: true,
							endButton: new sap.m.Button({
								text: "Close",
								press: () => oDialog.close()
							})
						});

						this.getView().addDependent(oDialog);
						oDialog.open();

						if (options.storeDialogRef) oControllerInstance._oDialog = oDialog;
					} else if (options.containerId) {
						const oContainer = this.byId(options.containerId);

						if (!oContainer) {
							return { root: oRootControl, controller: oControllerInstance };
						}

						// Remove previous content to avoid duplicates
						if (oContainer.removeAllItems) oContainer.removeAllItems();
						if (oContainer.removeAllContent) oContainer.removeAllContent();

						if (oContainer.addItem) oContainer.addItem(oControl);
						else if (oContainer.addContent) oContainer.addContent(oControl);
					}

					// Common settings: attach models and store controller
					if (options.storeController) {
						oControllerInstance.setFragmentRoot?.(oControl);
						oControllerInstance.setParentController?.(this);

						if (options.models) {
							Object.keys(options.models).forEach(modelName => {
								const oModel = options.models[modelName];
								if (oModel) oControl.setModel(oModel, modelName);
							});
						}
					}
				}

				return { root: oRootControl, controller: oControllerInstance };
			} catch (err) {
				MessageBox.error(this.oi18nModel.getText('visualIns_Fragment') + err.message);
				return null;
			}
		},

		/**Function use for Show Smart form tab
		* @memberof adnoc.vi.vehicleinspection.modone.controller.VisualInspection
		* @version 1.0.0
		* @since 01.01.2025
		* @author MA
		* @fires 
		*/
		onOpenESMAFragmentPopup: async function () {
			try {
				const ControllerClass = sap.ui.requireSync(
					"adnoc/vi/vehicleinspection/modone/fragment/FRGESMATest_V2Controller"
				);
				const oControllerInstance = new ControllerClass();
				const oModels = {
					aOrderProcessingModel: this.getOwnerComponent().getModel("aOrderProcessingModelBase"),
					ESMASaveModel: this.getView().getModel("ESMASaveModel"),
					ShowModel: this.getView().getModel("ShowModel")
				};

				const oFragmentResult = await this._loadFragmentFlexible(
					"adnoc.vi.vehicleinspection.modone.fragment.view.ESMATest_V2",
					oControllerInstance,
					{
						asDialog: true,
						storeController: true,
						storeDialogRef: true,
						dialogTitle: this.oi18nModel.getText('visualIns_ESMAFragment') + err.message,
						models: oModels
					}
				);

				const fragController = oFragmentResult.controller;
				if (!fragController._dataLoadedOnce) {
					await fragController.onBtnPressESMATest();
					fragController._dataLoadedOnce = true;
				}

			} catch (error) {
				MessageBox.error(this.oi18nModel.getText('visualIns_ESMA') + error.message);
			}
		},

		/**Function use for fetch data main category
		* @memberof adnoc.vi.vehicleinspection.modone.controller.VisualInspection
		* @version 1.0.0
		* @since 01.01.2025
		* @author MA
		* @fires 
		*/
		MainDefectCategoryLoad: async function () {
			await this.createNewModelUsingAPI("POST", `/fetchVisualData`, "", "UpdatedDefectDataModel");
			this.getView().setModel(this.getView().getModel("UpdatedDefectDataModel"), "SearchViewModel");
			let aUpdatedDefectDataModel = this.getView().getModel("UpdatedDefectDataModel");
			let aVisualInitializeModel = this.getView().getModel("VisualInitializeModel");
			let aVIRGlobalModel = this.getView().getModel("VIRGlobalModel");

			if (aUpdatedDefectDataModel) {
				let aSearchViewModel = this.getView().getModel("SearchViewModel");
				// let aVIRGlobalModel = this.getView().getModel("VIRGlobalModel");
				let aFetchVisualData = aUpdatedDefectDataModel.getData().fetchVisualData.aResponseArray;
				aUpdatedDefectDataModel.setProperty("/surajDefectData", aFetchVisualData);
				aSearchViewModel.setProperty("/surajDefectData", aFetchVisualData);
				var oCopiedData = JSON.parse(JSON.stringify(aFetchVisualData));
				aVIRGlobalModel.setProperty("/freshVisualData", oCopiedData);

			}
			//#region  This is use for previous data marge in the model
			this.updateSelectedMaterialLines(aVIRGlobalModel.getProperty("/CurrentInspection"));
			//#endregion  
			let aPreviousRow = aVisualInitializeModel.getProperty("/previousData");
			/*Get Previous Saved Data*/
			if (aPreviousRow && Array.isArray(aPreviousRow.results) && aPreviousRow.results.length > 0) {
				aPreviousRow.results.forEach((item) => {
					if (item) {
						/*item result modify for showing summary tab*/
						item.testResVsSDtl = item.testResVsSDtl?.results || [];
						this.oParentPayLoad.push(item);
					}
				});
				aVisualInitializeModel.setProperty("/LinesDefect", this.oParentPayLoad);
			}
			let oSelectedMaterailChar = aVIRGlobalModel.getProperty('/VisualSelectRowData');
			if (oSelectedMaterailChar) {
				let oVisualData = oSelectedMaterailChar.vehOrdInspLinesTestChars.results.find(Item => {
					return Item.applicableTestName == Constant.TESTTYPE.VISUAL;
				});
			}
		},

		/**Function use for get data 
		* @memberof adnoc.vi.vehicleinspection.modone.controller.VisualInspection
		* @version 1.0.0
		* @since 01.01.2025
		* @author MA
		* @fires 
		*/
		updateSelectedMaterialLines: async function (oSelectedMaterial) {
			if (!this.aPreviousAttachment) {
				this.aPreviousAttachment = [];
			}
			const oUniqueAttachments = new Set();
			let aVIRGlobalModel = this.getView().getModel("VIRGlobalModel");
			let aVisualInitializeModel = this.getView().getModel("VisualInitializeModel");
			let aSearchViewModel = this.getView().getModel("SearchViewModel");
			if (aVIRGlobalModel) {
				let oPlateNumber = aVIRGlobalModel.getProperty('/CurrentPlateNo');
				let oUpdatedData = aVIRGlobalModel.getProperty('/UpdatedDataModel');
				let aUpdatedDataModel = aVIRGlobalModel.getProperty("/freshVisualData");

				if (!oUpdatedData) {
					return;
				}
				let oSelectedMaterailChar = oUpdatedData.VehOrdInspDetails.results.find(x => x.plateNumber == oPlateNumber)
					.vehOrdInspLines.results.find(x => x.materialName == oSelectedMaterial)
					.vehOrdInspLinesTestChars.results.find(y => y.applicableTestName == Constant.TESTTYPE.VISUAL);

				if (oSelectedMaterailChar) {
					await this.createNewModelUsingAPI(
						"GET",
						`/TestResultsVisual?$filter=vehicleOrderInspectionLinesTestChar_VehicleOrderInspectionLinesTestCharUUID eq ${oSelectedMaterailChar.VehicleOrderInspectionLinesTestCharUUID}&$expand=testResVsSDtl($expand=testResvslAtt($expand=attachmentGuId))`,
						"",
						"FetchSaveDataModel");
					/*Get Flex Box */

					let oFlexBox = this.byId(ControlIds.VISUAL_ID.chipContainerId);
					aUpdatedDataModel.forEach(function (item) { item.Highlight = Constant.NONE });

					let aSelectedRow = this.getView().getModel('FetchSaveDataModel').getData();
					if (oSelectedMaterailChar.testStatus == Constant.STATUS.INPROGRESS && aSelectedRow.results.length > 0) {
						aSelectedRow.results.forEach(Item => {
							let data = {
								examinationMethodArabic: Item.examinationMethodArabic,
								examinationMethodEnglish: Item.examinationMethodEnglish,
								testMainTypeNo: Item.testMainTypeNo,
								testMainTypeTextArabic: Item.testMainTypeTextArabic,
								testMainTypeTextEnglish: Item.testMainTypeTextEnglish,
								testMaterialCode: Item.testMaterialCode,
								testSubTypeNo: Item.testSubTypeNo,
								testSubTypeTextArabic: Item.testSubTypeTextArabic,
								testSubTypeTextEnglish: Item.testSubTypeTextEnglish,
								testResVsSDtl: []
							}
							Item.testResVsSDtl.results.forEach(SubItem => {
								let subItem = {
									Remarks: SubItem.Remarks,
									issueType: SubItem.issueType,
									testTypeKey: SubItem.testTypeKey,
									testTypeTextArabic: SubItem.testTypeTextArabic,
									testTypeTextEnglish: SubItem.testTypeTextEnglish,
									testResvslAtt: []
								}
								SubItem.testResvslAtt.results.forEach(Item => {
									let attGuid = Item.attachmentGuId.attachmentGuId;
									if (!oUniqueAttachments.has(attGuid)) {
										oUniqueAttachments.add(attGuid);
										this.aPreviousAttachment.push({
											attachmentName: Item.attachmentGuId.attachmentName,
											docId: Item.attachmentGuId.docId,
											attachmentGuId: attGuid,
											docGuid: Item.attachmentGuId.docGuid
										});
									}
									subItem.testResvslAtt.push({
										attachmentGuId_attachmentGuId: attGuid
									});
								});
								data.testResVsSDtl.push(subItem)
							});
							this.oParentPayLoad.push(data);
						});
						aVisualInitializeModel.setProperty("/LinesDefect", this.oParentPayLoad);
					}
					/*If selected material has confirmed then Save & Confirm button must be hide */
					if (oSelectedMaterailChar.testStatus == Constant.STATUS.PASS || oSelectedMaterailChar.testStatus == Constant.STATUS.FAIL) {
						this.byId(ControlIds.VISUAL_ID.SAVEBUTTON).setVisible(false);
						this.byId(ControlIds.VISUAL_ID.BUTTONCONFIRM).setVisible(false);
						this.byId(ControlIds.VISUAL_ID.EDITBUTTON).setEnabled(false);
						this.byId(ControlIds.VISUAL_ID.CHECKBOXSUBCATEGORY).setEnabled(false);
						let ViewData = []
						aSelectedRow.results.forEach(Item => {
							let data = {
								examinationMethodArabic: Item.examinationMethodArabic,
								examinationMethodEnglish: Item.examinationMethodEnglish,
								testMainTypeNo: Item.testMainTypeNo,
								testMainTypeTextArabic: Item.testMainTypeTextArabic,
								testMainTypeTextEnglish: Item.testMainTypeTextEnglish,
								testMaterialCode: Item.testMaterialCode,
								testSubTypeNo: Item.testSubTypeNo,
								testSubTypeTextArabic: Item.testSubTypeTextArabic,
								testSubTypeTextEnglish: Item.testSubTypeTextEnglish,
								testResVsSDtl: [],
								testResvslAtt: []
							};
							Item.testResVsSDtl.results.forEach(SubItem => {
								let subItem = {
									Remarks: SubItem.Remarks,
									issueType: SubItem.issueType,
									testTypeKey: SubItem.testTypeKey,
									testTypeTextArabic: SubItem.testTypeTextArabic,
									testTypeTextEnglish: SubItem.testTypeTextEnglish
								};
								SubItem.testResvslAtt.results.forEach(AttItem => {
									let attData = {
										attachmentName: AttItem.attachmentGuId.attachmentName,
										docId: AttItem.attachmentGuId.docId,
										attachmentGuId: AttItem.attachmentGuId.attachmentGuId
									};
									data.testResvslAtt.push(attData);
								});
								data.testResVsSDtl.push(subItem);
							});
							// Final push
							ViewData.push(data);
						});
						let oViewUpload = new JSONModel(ViewData);
						this.getView().setModel(oViewUpload, 'ViewUploadModel');
					} else {
						this.byId(ControlIds.VISUAL_ID.SAVEBUTTON).setVisible(true);
						this.byId(ControlIds.VISUAL_ID.BUTTONCONFIRM).setVisible(true);
					}

					/*GET UUID for select Characterstics*/
					aVisualInitializeModel.setProperty("/VehicleOrderInspectionLinesTestCharUUID", oSelectedMaterailChar.VehicleOrderInspectionLinesTestCharUUID);
					if (aSelectedRow != null) {
						if (aSelectedRow.results.length > 0) {
							/* Check if this service number has already process then set an flag for saving */
							aVisualInitializeModel.setProperty("/isSaved", true);
							aVisualInitializeModel.setProperty("/previousData", aSelectedRow);

							aSelectedRow.results.forEach(function (item) {
								let _data = aUpdatedDataModel.find(x => x.testMainTypeNo == Number(item.testMainTypeNo));
								_data.Highlight = Constant.INFORMATION;

								_data.SubCategory.find(x => x.testSubTypeNo == item.testSubTypeNo).selected = true;
								var oToggle = oFlexBox.getItems().find(x => x.getText() == item.testMainTypeTextEnglish);
								if (oToggle) {
									oToggle.setType('Emphasized');
								}
							});
						}
					}
					else {
						aVisualInitializeModel.setProperty("/isSaved", false);
						this.byId(ControlIds.VISUAL_ID.SAVEBUTTON).setVisible(true);
						this.byId(ControlIds.VISUAL_ID.BUTTONCONFIRM).setVisible(true);
					}
					aSearchViewModel.setProperty("/surajDefectData", aUpdatedDataModel);
					aSearchViewModel.setProperty("/SubCategory", null);
					aSearchViewModel.refresh();

					if (oSelectedMaterailChar.testStatus == Constant.STATUS.PASS || oSelectedMaterailChar.testStatus == Constant.STATUS.FAIL) {
						let oModel = aSearchViewModel;
						let oData = oModel.getData();
						if (oData && oData.surajDefectData) {
							oData.surajDefectData.forEach((Item, Index) => {
								let sPath = `/surajDefectData/${Index}/`;
								oModel.setProperty(sPath + "charStatus", oSelectedMaterailChar.testStatus);
								if (Item.Highlight === "Information") {
									oModel.setProperty(sPath + "isEnableMainCategoryBtn", true);

								} else {
									oModel.setProperty(sPath + "isEnableMainCategoryBtn", false);
								}
							});
						}
					}
				}
			}
		},

		/**Function use for load SVG
		* @memberof adnoc.vi.vehicleinspection.modone.controller.VisualInspection
		* @version 1.0.0
		* @since 01.01.2025
		* @author MA
		* @fires 
		*/
		loadSVG: function () {
			var imagepath = this.getView().getModel("imageModel").getData().path;
			$.ajax({
				// url: "assets/Carinspection.svg",
				url: imagepath + "/image/CarExterior.svg",
				async: true,
				success: data => {
					const content = new XMLSerializer().serializeToString(data);
					this.getView().byId("idSvgContainer").setContent(content);
					this.RenderSVG();
				}
			});
		},


		/**Function use for Render SVG
		* @memberof adnoc.vi.vehicleinspection.modone.controller.VisualInspection
		* @version 1.0.0
		* @since 01.01.2025
		* @author MA
		* @fires 
		*/
		RenderSVG: function () {
			const aPaths = this.getView().byId("idSvgContainer").$().find("path");
			// check elements are already in the DOM
			if (!aPaths.length) return

			// register onclick event for the elements
			aPaths.bind("click", this._handlePathClick.bind(this));
		},

		/**Function use for Render SVG
		* @memberof adnoc.vi.vehicleinspection.modone.controller.VisualInspection
		* @version 1.0.0
		* @since 01.01.2025
		* @author MA
		* @fires 
		*/
		_handlePathClick(oEvent) {

			// get clicked path
			const oPath = $(oEvent.target);
			const sCountry = oPath.attr("id");
			const sDescription = oPath.attr("aria-label");
			const activeElements = document.querySelectorAll('.maplink.active');
			activeElements.forEach(el => el.classList.remove('active'));

			let pathElement = oEvent.currentTarget.className.baseVal;
			if (pathElement.indexOf("maplink") >= 0) {
				oEvent.currentTarget.classList.add('active');
			}
			// var sidelist =this.getView().getModel("SearchViewModel")
			var sidelist = this.getView().getModel("SearchViewModel").getProperty("/SideList");
			if (sCountry) {
				sidelist.push({
					"Parts": sCountry
				});
			}
			var aDups = [];
			var aWithoutDup = sidelist.filter(function (el) {
				// If it is not a duplicate, return true
				if (aDups.indexOf(el.Parts) == -1) {
					aDups.push(el.Parts);
					return true;
				}
				return false;
			});
			this.getView().getModel("SearchViewModel").setProperty("/SideList", aWithoutDup);
			this.getView().getModel("SearchViewModel").setProperty("/BtnEnabled", true);

		},

		/**Function use Svg Container Rendered
		* @memberof adnoc.vi.vehicleinspection.modone.controller.VisualInspection
		* @version 1.0.0
		* @since 01.01.2025
		* @author MA
		* @fires 
		*/
		onSvgContainerRendered(oEvent) {

			// get all path elements inside the svg
			const aPaths = oEvent.getSource().$().find("path");

			// check elements are already in the DOM
			if (!aPaths.length) return

			// register onclick event for the elements
			aPaths.bind("click", this._handlePathClick.bind(this));
		},

		/**Function use Press clear
		* @memberof adnoc.vi.vehicleinspection.modone.controller.VisualInspection
		* @version 1.0.0
		* @since 01.01.2025
		* @author SP
		* @fires 
		*/
		onPressclear: function () {
			this.getView().getModel("SearchViewModel").setProperty("/SideList", []);
			var aActiveElements = document.querySelectorAll('.maplink.active');
			aActiveElements.forEach(el => el.classList.remove('active'));
		},

		/**Function use handle Nav
		* @memberof adnoc.vi.vehicleinspection.modone.controller.VisualInspection
		* @version 1.0.0
		* @since 01.01.2025
		* @author SP
		* @fires 
		*/
		handleNav: function (evt) {
			var navCon = this.byId("id_VInavCon");
			var target = evt.getSource().data("target");
			if (target) {
				// var animation = this.byId("animationSelect").getSelectedKey();
				navCon.to(this.byId(target), "fade");
			} else {
				navCon.back();
			}
		},

		/**Function use for click main category
		* @memberof adnoc.vi.vehicleinspection.modone.controller.VisualInspection
		* @version 1.0.0
		* @since 01.01.2025
		* @author MA
		* @fires 
		*/
		handleMainTypeTextPress: function (oEvent) {
			var oButton = oEvent.getSource();
			let sGetStatus = oEvent.getSource().getBindingContext('SearchViewModel').getObject();
			let VisualInitializeModel = this.getView().getModel("VisualInitializeModel");
			let SearchViewModel = this.getView().getModel("SearchViewModel");
			VisualInitializeModel.setProperty("/testMainType", sGetStatus.testMainType);
			VisualInitializeModel.setProperty("/ButtonAccess", oButton);

			if (oButton.getType() === 'Emphasized') {
				oButton.setType("Emphasized");
			} else {
				oButton.setType("Emphasized");
			}
			sGetStatus.State = true;
			SearchViewModel.setProperty("/mainCatSelectedObject", sGetStatus);
			var oTextMainType = this.byId(ControlIds.VISUAL_ID.txtMainTypeMsg);
			oTextMainType.setText(sGetStatus.testMainType);
			var checkSelected = sGetStatus.controlTypeValueLabel1;
			if (checkSelected == null || checkSelected == false) {
				sGetStatus.controlTypeValueLabel1 = true;
			}
			else {
				var that = this;
				if (sGetStatus.charStatus === Constant.STATUS.OPEN || sGetStatus.charStatus === Constant.STATUS.INPROGRESS || sGetStatus.charStatus === undefined) {
					sap.m.MessageBox.confirm(
						this.oi18nModel.getText("VisualIns_MessageToastmainCategoryRemove"), {
						icon: sap.m.MessageBox.Icon.CONFIRM,
						title: this.oi18nModel.getText("commonmsgConfirmation"),
						actions: [sap.m.MessageBox.Action.YES, sap.m.MessageBox.Action.NO],
						onClose: function (oAction) {
							if (oAction === Constant.STATUS.YES) {
								this.onLoadRemoveSubOrMainCategory(sGetStatus);
								oButton.setType("Transparent");
							} else if (oAction === Constant.STATUS.NO) {
								oButton.setType("Emphasized");
							}
						}.bind(this)
					});
				}
			}
			var path = oEvent.getSource().getBindingContext("SearchViewModel").getPath().split("/")[2];
			SearchViewModel.setProperty("/catSelectedIndex", path);
			SearchViewModel.setProperty("/SubCategory", sGetStatus.SubCategory);
			SearchViewModel.refresh();

		},

		/**Function use for click main category
		* @memberof adnoc.vi.vehicleinspection.modone.controller.VisualInspection
		* @version 1.0.0
		* @since 01.01.2025
		* @author MA
		* @fires 
		*/
		onCheckListSelect: function (oEvent) {
			let oCheckBox = oEvent.getSource();
			let oContext = oCheckBox.getBindingContext("SearchViewModel");
			let oVisualInitializeModel = this.getView().getModel("VisualInitializeModel");
			let oGetSearchViewModel = oEvent.getSource().getBindingContext("SearchViewModel").getObject();
			let oSearchViewModel = this.getView().getModel("SearchViewModel");
			let oModelData = oContext.getModel();
			oVisualInitializeModel.setProperty("/selectedValue", oGetSearchViewModel.testSubTypeTextEnglish);

			if (!this.oSetSubcategory) {
				this.oSetSubcategory = []
			}
			this.oSetSubcategory.push(oGetSearchViewModel);
			if (this.oVisualfile) {
				this.oVisualfile = {
					FileCategory: []
				}
			}
			this.onLoadClearData();
			let oSubCategoryChechBox = oEvent.getSource().getSelected();
			if (!oSubCategoryChechBox) {
				sap.m.MessageBox.confirm(this.oi18nModel.getText('VisualIns_MessageBoxConfirmdelete'), {
					icon: sap.m.MessageBox.Icon.CONFIRM,
					title: this.oi18nModel.getText('VisualIns_MessageBoxConfirm'),
					actions: [sap.m.MessageBox.Action.YES, sap.m.MessageBox.Action.NO],
					onClose: function (oAction) {
						if (oAction === Constant.YESANDNO.YES) {
							this.onLoadRemoveSubOrMainCategory(oGetSearchViewModel);
							return
						} else {
							oModelData.setProperty(oContext.getPath() + "/selected", !oSubCategoryChechBox);
						}
					}.bind(this)
				});
			} else {

				// var currObj = oEvent.getSource().getBindingContext("SearchViewModel").getObject();
				if (oEvent.getSource().getSelected() === true) {
					if (!this.VIStatusFrag) {
						this.VIStatusFrag = sap.ui.xmlfragment("VisualInspectionTestStatusId", "adnoc.vi.vehicleinspection.modone.fragment.view.VisualInspectionTestStatus", this);
						this.getView().addDependent(this.VIStatusFrag);
					}
					this.VIStatusFrag.open();

					oGetSearchViewModel.controlTypeValueLabel1 = true;
					var path = oEvent.getSource().getBindingContext("SearchViewModel").getPath().split("/")[2]
					this.object = parseInt(path);
					this.object1 = oGetSearchViewModel;

					/*Set Current selected CheckBox Row*/
					oVisualInitializeModel.setProperty("/currObj", oGetSearchViewModel);
					var oModel = oVisualInitializeModel;
					oModel.setProperty("/selectedValue", this.object1.testSubTypeTextEnglish);
					oSearchViewModel.setProperty("/subCatSelectedValue", this.object1.conditionalMappingMasterCode);
					oSearchViewModel.setProperty("/subCatSelectedIndex", path);
					oSearchViewModel.setProperty("/surajChildSubCategory", oGetSearchViewModel.ChildSubCategory);
					oSearchViewModel.refresh();
				}
				else {

					oGetSearchViewModel.controlTypeValueLabel1 = false;
					// Get the model (typically bound to your view)
					var aLines = oVisualInitializeModel.getProperty("/LinesDefect");

					// Define the value you want to match (for example, 'Banana')
					var productToRemove = oGetSearchViewModel.testSubTypeNo;

					// Find the index of the item to be removed based on product name
					var iIndexToRemove = aLines.findIndex(function (item) {
						return item.testSubTypeNo === productToRemove; // Matching by product name
					});

					// If the item is found (i.e., index !== -1), remove it
					if (iIndexToRemove !== -1) {
						// Remove the item from the array
						aLines.splice(iIndexToRemove, 1);
						// Update the model with the modified array
						oVisualInitializeModel.setProperty("/LinesDefect", aLines);
						sap.m.MessageToast.show(this.oi18nModel.getText('visualIns_Fragment'), [oGetSearchViewModel.testSubTypeTextEnglish]);
					}

				}

				// Access the control and apply CSS to change the tile color.
				let oMinorTile = sap.ui.core.Fragment.byId(ControlIds.VISUAL_ID.fragment_VisualInspectionTestStatusId, ControlIds.VISUAL_ID.TILE_MINORID);
				let oMajorTile = sap.ui.core.Fragment.byId(ControlIds.VISUAL_ID.fragment_VisualInspectionTestStatusId, ControlIds.VISUAL_ID.TILE_MEJORID);
				let oTextAreaInut = sap.ui.core.Fragment.byId(ControlIds.VISUAL_ID.fragment_VisualInspectionTestStatusId, ControlIds.VISUAL_ID.fragment_txtCategoryRemarks);
				let oAddFileFile = sap.ui.core.Fragment.byId(ControlIds.VISUAL_ID.fragment_VisualInspectionTestStatusId, ControlIds.VISUAL_ID.BTNADDTILEFILE);
				oTextAreaInut.setEditable(false);
				oMinorTile.addStyleClass("disabledItem");
				oMajorTile.addStyleClass('disabledItem');
				oAddFileFile.addStyleClass('disabledItem');

			}
			var oModel = this.getView().getModel("FileUploadedArrayModel");
			oModel.setProperty('/FileCategory', []);
			this.onLoadApplyTileColors(null);
		},

		/**Function use for check the valeue is selected or not  
		* @memberof adnoc.vi.vehicleinspection.modone.controller.VisualInspection
		* @version 1.0.0
		* @since 01.01.2025
		* @author MA
		* @fires 
		*/
		onCloseVIStatusf4: function () {
			let oVisualInitializeModel = this.getView().getModel("VisualInitializeModel")?.getData()
			let oCurrentData = this.oParentPayLoad.some(Item => Item.testSubTypeTextEnglish === oVisualInitializeModel.selectedValue);
			let SearchData = this.getView().getModel("SearchViewModel");
			if (SearchData) {
				SearchData.getData().surajDefectData.forEach((Item, index) => {
					Item.SubCategory.forEach((SubItem, SubIndex) => {
						let Subcategory = SubItem.testSubTypeTextEnglish;
						if ((!oCurrentData) && (Subcategory === oVisualInitializeModel.selectedValue) && (!Subcategory.selected)) {
							SearchData.setProperty(`/surajDefectData/${index}/SubCategory/${SubIndex}/selected`, false);
						}
					});
				})
			}
			this.VIStatusFrag.close();
		},

		/**Function use for Live change remarks. 
		* @memberof adnoc.vi.vehicleinspection.modone.controller.VisualInspection
		* @version 1.0.0
		* @since 01.01.2025
		* @author MA
		* @fires 
		*/
		onRemarksLiveChange: function (oEvent) {
			let aSearchViewModel = this.getView().getModel("SearchViewModel")
			var sText = oEvent.getParameter("value");
			aSearchViewModel.setProperty("/remarksValue", sText);
		},

		/**Function use for create payload and apply color on tile onPressTile
		* @memberof adnoc.vi.vehicleinspection.modone.controller.VisualInspection
		* @version 1.0.0
		* @since 01.01.2025
		* @author MA
		* @fires onLoadApplyTileColors,onLoadTilesValidation,onLoadCreatePayload,onLoadAttachmentCreatePayload
		*/
		onTilePress: function (oEvent) {
			const oTile = oEvent.getSource();
			this.onLoadApplyTileColors(oTile);
			let validationFlag = this.onLoadTilesValidation(oTile);
			if (validationFlag) {
				this.onLoadCreatePayload(oTile, oEvent);
				this.onLoadAttachmentCreatePayload(oEvent);
			}
		},

		/** Function for 
		* @memberof adnoc.vi.vehicleinspection.modone.controller.VisualInspection
		* @version 1.0.0
		* @since 09.17.2025
		* @author MA
		* @fires
		*/
		onOpenDefects: async function (oEvent) {
			let aVehicleSideSelectedData = this.getView().getModel('VehicleSideSelectedModel');
			let oSearchViewModel = oEvent.getSource().getBindingContext("SearchViewModel").getObject();
			if (aVehicleSideSelectedData) {
				aVehicleSideSelectedData.setData([]);
			}
			let oVisualInitializeModel = this.getView().getModel("VisualInitializeModel");
			oVisualInitializeModel.setProperty("/selectedValue", oSearchViewModel.testSubTypeTextEnglish);
			oVisualInitializeModel.setProperty("/selectedValue", oSearchViewModel.testSubTypeTextEnglish);
			oVisualInitializeModel.setProperty("/SelectedSubcategory", oSearchViewModel);

			this.onLoadClearData();
			let oSelectedMaterailChar = this.getView().getModel("VIRGlobalModel").getProperty('/VisualSelectRowData');
			if (oSelectedMaterailChar) {
				let oVisualData = oSelectedMaterailChar.vehOrdInspLinesTestChars.results.find(Item => {
					return Item.applicableTestName == Constant.TESTTYPE.VISUAL;
				});
				let aVisualData = this.getView().getModel("SearchViewModel"); //.surajDefectData
				if (oVisualData.testRessVisuals.results.length > 0) {
					aVisualData.getData().surajDefectData.forEach((Item, MeinIndex) => {
						Item.SubCategory.forEach((SubItem, SubIndex) => {
							SubItem.ChildSubCategory.forEach((ChildItem, ChildIndex) => {
								oVisualData.testRessVisuals.results.forEach((SelectItem, mainIndex) => {
									if (Item.testMainType === SelectItem.testMainTypeTextEnglish && SubItem.testSubTypeTextEnglish === SelectItem.testSubTypeTextEnglish) {
										SelectItem.testResVsSDtl.results.forEach((ChildSelect, ChildSelectIndex) => {
											if (ChildSelect.testTypeTextEnglish == ChildItem.testTypeTextEnglish) {
												aVisualData.setProperty(`/surajDefectData/${MeinIndex}/SubCategory/${SubIndex}/ChildSubCategory/${ChildIndex}/Highlight`, 'Information');
												aVisualData.setProperty(`/surajDefectData/${MeinIndex}/SubCategory/${SubIndex}/ChildSubCategory/${ChildIndex}/remarks`, ChildSelect.Remarks);

											}
										})
									}
								})
							});
						});
					});
				}
			}

			let oEditButton = oEvent.getSource();
			let oListItem = oEditButton.getParent();
			let aSelectSide = [];
			let oContext = oListItem.getBindingContext("SearchViewModel");
			if (!this.oSetSubcategory) {
				this.oSetSubcategory = [];
			}
			this.oSetSubcategory.push(oContext);
			if (oListItem) {
				var oData = oContext.getObject();
				this.oClockEditButton = oData;
				aSelectSide = await oData.ChildSubCategory.filter(Item => { return Item.Highlight === 'Information' });
			}
			let oSelectedData = new JSONModel(aSelectSide);
			this.getView().setModel(oSelectedData, 'SelectedVehicleSideModel');
			if (!this.VIStatusFrag) {
				this.VIStatusFrag = sap.ui.xmlfragment("VisualInspectionTestStatusId", "adnoc.vi.vehicleinspection.modone.fragment.view.VisualInspectionTestStatus", this);
				this.getView().addDependent(this.VIStatusFrag);
			}
			this.onLoadApplyTileColors(null);
			this.VIStatusFrag.open();
			let aButtionsIds = ControlIds.VISUALBUTTONSID;
			if (aSelectSide.length <= 0) {
				let data = this.oParentPayLoad.find(Item => {
					return Item.testSubTypeTextEnglish == oContext.getObject().testSubTypeTextEnglish

				});
				if (data) {
					aSelectSide = data.testResVsSDtl;
				}

			}

			this.aClickedButton = aSelectSide;
			aButtionsIds.forEach(sId => {
				let button = sap.ui.core.Fragment.byId("VisualInspectionTestStatusId", sId);
				let sSelected = aSelectSide.some(SelectItem => SelectItem.testTypeTextEnglish === button.getCustomData()[0].getValue())
				if (sSelected) {
					button.addStyleClass("active");
					button.setType("Emphasized");
				} else {
					button.removeStyleClass("active");
					button.setType("Default");
				}
			});
			if (this.aPreviousAttachment.length > 0) {
				let FinalData = this.aPreviousAttachment.filter(Item => Number(oData.testSubTypeNo) == Item.docId && oData.testSubTypeTextEnglish == Item.docGuid);
				let oPrevious = new JSONModel({ FileCategory: FinalData });
				if (!this.oVisualfile) {
					this.oVisualfile = { FileCategory: FinalData }
				}
				else {
					// let attachment = this.oVisualfile.FileCategory.filter(item =>item.attachmentGuId ==null );
					this.oVisualfile.FileCategory.forEach(Item => {
						if (Item.attachmentGuId == null) {
							oPrevious.oData.FileCategory.push(Item);
						}
					})

				}
				// let oCurrentSubCategory = this.getView().getModel("VisualInitializeModel").getData();
				// let aAttachment = this.oVisualfile.FileCategory.filter(Item => Item.docGuid == oCurrentSubCategory.selectedValue);
				// if (aAttachment) {
				// 	oPrevious.oData.FileCategory.push(aAttachment);
				this.getView().setModel(oPrevious, 'FileUploadedArrayModel');
				// }


				let aFileUploaded = this.getView().getModel('FileUploadedArrayModel');
				if (aFileUploaded) {
					let dataFilter = FinalData.filter((item, index, self) =>
						index === self.findIndex(t => t.attachmentName === item.attachmentName)
					)
					if (dataFilter.length > 0) {
						aFileUploaded.setProperty("/FileCategory", dataFilter);
						aFileUploaded.refresh(true);
					}
				}

			}
			else {
				let oCurrentSubCategory = this.getView().getModel("VisualInitializeModel").getData();
				let aAttachment = this.oVisualfile.FileCategory.filter(Item => Item.docGuid == oCurrentSubCategory.selectedValue);
				this.getView().getModel('FileUploadedArrayModel').setProperty('/FileCategory', aAttachment)
			}
			let oTextAreaInut = sap.ui.core.Fragment.byId(ControlIds.VISUAL_ID.fragment_VisualInspectionTestStatusId, ControlIds.VISUAL_ID.fragment_txtCategoryRemarks);
			let oMinorTile = sap.ui.core.Fragment.byId(ControlIds.VISUAL_ID.fragment_VisualInspectionTestStatusId, ControlIds.VISUAL_ID.TILE_MINORID);
			let oMajorTile = sap.ui.core.Fragment.byId(ControlIds.VISUAL_ID.fragment_VisualInspectionTestStatusId, ControlIds.VISUAL_ID.TILE_MEJORID);
			let oAddFileFile = sap.ui.core.Fragment.byId(ControlIds.VISUAL_ID.fragment_VisualInspectionTestStatusId, ControlIds.VISUAL_ID.BTNADDTILEFILE);
			oMinorTile.removeStyleClass("disabledItem");
			oMajorTile.removeStyleClass("disabledItem");
			oAddFileFile.removeStyleClass("disabledItem");
			oTextAreaInut.setEditable(true);
		},

		/** Function for show summary 
		* @memberof adnoc.vi.vehicleinspection.modone.controller.VisualInspection
		* @version 1.0.0
		* @since 09.17.2025
		* @author MA
		* @fires
		*/
		onBtnPressSummry: function (oEvent) {
			var oButton = oEvent.getSource();
			if (!this.StatusPopover) {
				Fragment.load({
					name: "adnoc.vi.vehicleinspection.modone.fragment.view.VisualSummary",
					controller: this
				}).then(function (oPopover) {
					this.StatusPopover = oPopover;
					this.getView().addDependent(this.StatusPopover);
					this.StatusPopover.openBy(oButton);
				}.bind(this));
			} else {
				this.StatusPopover.openBy(oButton);
			}
			let oModel = this.getView().getModel('VisualInitializeModel');
			if (!oModel.getData().LinesDefect) {
				oModel.setProperty('/LinesDefect', this.getView().getModel('ViewUploadModel').getData())
			}
		},

		/** Function for save the visula test and also other
		* @memberof adnoc.vi.vehicleinspection.modone.controller.VisualInspection
		* @version 1.0.0
		* @since 09.17.2025
		* @author MA
		* @fires
		*/
		onBtnPressSaveVisualTest: async function (oEvent) {
			let oVisualInitializeModel = this.getView().getModel("VisualInitializeModel");
			let oVIRGlobalModel = this.getView().getModel("VIRGlobalModel")
			let sTestCharUUID = oVisualInitializeModel.getProperty("/VehicleOrderInspectionLinesTestCharUUID");
			let oAttachmentData = await this.onLoadSaveAttachment();
			this.onloadPushAttachmentPayload(oAttachmentData)
			let aRequestPayload = this.oParentPayLoad;

			if (aRequestPayload.length <= 0) {
				MessageBox.warning(this.oi18nModel.getText("visualIns_MessageToastConfirmedSaveConfirm"));
				return
			}
			let oFinalPayLoad = this.getView().getModel('VisualSaveAndComfirmModel').getData();
			if (oFinalPayLoad.VisualHeader) {
				let oSaveDataModel = oFinalPayLoad.VisualHeader;
				oSaveDataModel.applicableTestName = Constant.TESTTYPE.VISUAL;
				oSaveDataModel.testComments = null;
				oSaveDataModel.testInspectedBy = this.oEmployeeData.empNameEnglish;
				oSaveDataModel.testStatus = Constant.STATUS.INPROGRESS;
				oSaveDataModel.testRessVisuals = aRequestPayload

				await this.createNewModelUsingAPI(
					'PATCH',
					`/VehicleOrderInspectionLinesTestChar('${sTestCharUUID}')?$expand=testRessVisuals`,
					oSaveDataModel,
					'VisualSaveModel'
				);

				let oVisualSaveModelModel = this.getView().getModel('VisualSaveModel');

				if (oVisualSaveModelModel != undefined) {
					/* Set saved value is true for button Hide functionality*/
					oVisualInitializeModel.setProperty("/isSaved", true);
					sap.m.MessageToast.show(this.oi18nModel.getText("VisualIns_MessageToastSavedSuccessfully"));
				}
				// }
				let oSurajServiceItems = oVIRGlobalModel.getProperty("/surajService");
				let oCurrentInspection = oVIRGlobalModel.getProperty("/CurrentInspection");

				// Loop through and add a new property
				oSurajServiceItems.forEach(function (item, index) {
					if (item.materialName == oCurrentInspection)
						item.highlight = "Success";
				});

				oVIRGlobalModel.refresh();
				this.onLoadUpdateUpdateAttachment(oAttachmentData, sTestCharUUID);
				this.onPressOrderProcessing();
				if (this.oAttachmentData) {
					let updatePayload = []
					this.oAttachmentData.forEach(Item => {
						let data = {
							attachmentGuId: Item.attachmentGuId,
							docGuid: sTestCharUUID
						}
						updatePayload.push(data);
					});
					let oPayload = { Files: updatePayload }
					// await this.createNewModelUsingAPI('PATCH', `/updateAttachmentDocGuid`, oPayload, 'VisualSaveModel');
				}
				this.aAttachmentPayload = [];
			}
		},

		/** Function for Confirm Visual Test
		* @memberof adnoc.vi.vehicleinspection.modone.controller.VisualInspection
		* @version 1.0.0
		* @since 09.17.2025
		* @author MA
		* @fires
		*/
		onBtnPressConfirmVisualTest: async function () {
			var oTabBar = this.byId("idIconTabBar");
			let oVisualInitializeModel = this.getView().getModel("VisualInitializeModel");
			var oSelectedItem = oVisualInitializeModel.getData().materialName
			let oAttachmentData = await this.onLoadSaveAttachment();
			this.onloadPushAttachmentPayload(oAttachmentData);
			let status = Constant.STATUS.PASS;

			let bIsSaved = oVisualInitializeModel.getProperty("/isSaved");
			let aOrderLines = oVisualInitializeModel.getProperty("/surajService")

			if (!bIsSaved) {
				bIsSaved = true;
			}

			if (aOrderLines) {
				const finalResult = aOrderLines.map(item => {
					return {
						...item,  // full header
						vehOrdInspLinesTestChars: {
							results: item.vehOrdInspLinesTestChars.results.filter(
								sub => sub.applicableTestName === "VI_VISUAL_TEST"
							)
						}
					};
				});
				let oFinalPayLoad = oVisualInitializeModel.getData();
				let oSaveDataModel
				if (this.oParentPayLoad.length > 0) {
					this.oParentPayLoad.forEach((item) => {
						item.testResVsSDtl.forEach((child) => {
							if (child.issueType == Constant.VISUALCONSTANTS.ISSUETYPEMAJOR) {
								status = Constant.VISUALCONSTANTS.FAILED;
								return;
							}
						})
					});
				}
				if (oFinalPayLoad.VisualHeader) {
					oSaveDataModel = oFinalPayLoad.VisualHeader;
					oSaveDataModel.applicableTestName = Constant.TESTTYPE.VISUAL;
					oSaveDataModel.testComments = null;
					oSaveDataModel.testInspectedBy = this.oEmployeeData.empNameEnglish;
					oSaveDataModel.testStatus = status;
					oSaveDataModel.testRessVisuals = this.oParentPayLoad
				}
				if (this.oParentPayLoad.length <= 0) {
					MessageBox.warning(this.oi18nModel.getText("visualIns_MessageToastConfirmedSaveConfirm"));
					return
				}
				MessageBox.confirm(
					this.oi18nModel.getText("salesOrder_messageToastAreyousureyouwanttoConfirm"), {
					icon: MessageBox.Icon.INFORMATION,
					title: this.oi18nModel.getText("modified_Confirm"),
					class: "sapUiSizeCompact",
					actions: [MessageBox.Action.YES, MessageBox.Action.NO],
					onClose: function (oAction) {
						if (oAction === Constant.YESANDNO.YES) {
							finalResult.forEach(async Item => {
								let ClickedVisual = Item.materialName;
								let sTestCharUUID = Item.vehOrdInspLinesTestChars.results.find(Item => true).VehicleOrderInspectionLinesTestCharUUID;
								let CurrentStatus = Item.vehOrdInspLinesTestChars.results.find(Item => true).testStatus;
								let oPayload = {
									applicableTestName: Constant.TESTTYPE.VISUAL,
									testComments: null,
									testInspectedBy: this.oEmployeeData.empNameEnglish,
									testStatus: status,
									testRessVisuals: this.oParentPayLoad
								}
								if ((CurrentStatus !== Constant.STATUS.PASS) && (CurrentStatus !== Constant.STATUS.FAIL)) {
									if ((ClickedVisual === oSelectedItem)) {
										oPayload.testStatus = status;
									} else {
										oPayload.testStatus = Constant.STATUS.INPROGRESS;
									}
									let oRemoveDataVisualPayload = {
										applicableTestName: Constant.TESTTYPE.VISUAL,
										testComments: null,
										testInspectedBy: this.oEmployeeData.empNameEnglish,
										testStatus: oPayload.testStatus,
										testRessVisuals: null
									}
									/*Delete old dara and inser new data with the patch*/
									await this.createNewModelUsingAPI('PATCH', `/VehicleOrderInspectionLinesTestChar('${sTestCharUUID}')`, oRemoveDataVisualPayload, 'VisualSaveModel');
									await this.createNewModelUsingAPI('PATCH', `/VehicleOrderInspectionLinesTestChar('${sTestCharUUID}')`, oPayload, 'VisualSaveModel');

								}
							});
							sap.m.MessageToast.show(this.oi18nModel.getText("visualIns_MessageToastConfirmedSuccessfully"));
							this.onPressOrderProcessing();
						}
					}.bind(this)
				});
			}
		},

		/** Function for update the attachment for mapping
		* @memberof adnoc.vi.vehicleinspection.modone.controller.VisualInspection
		* @version 1.0.0
		* @since 09.17.2025
		* @author MA
		* @fires
		*/
		onLoadUpdateUpdateAttachment: async function (aPayload, lTestCharUUID) {
			if (aPayload.length > 0) {
				let oPayload = { Files: [] }
				aPayload.value.forEach(Item => {
					let data = {
						attachmentGuId: Item.attachmentGuId,
						docGuid: lTestCharUUID
					}
					oPayload.Files.push(data)
				})
				await this.createNewModelUsingAPI('POST', `/updateAttachmentDocGuid`,
					oPayload,
					'UpdateAttachmentModel'
				);
			}
		},

		//#region Code for Attachment 

		/**
		 * Functon for open fragment.
		 * @memberof adnoc.vi.vehicleinspection.modone.controller.VisualInspection
		 * @version 1.0.0
		 * @since 09.05.2025
		 * @fires onBtnPressFileUploadVisual
		 * @author MA
		*/
		onBtnPressFileUploadVisual: function () {
			if ((!this.aClickedButton) || (!this.aClickedButton.length > 0)) {
				MessageBox.warning(this.oi18nModel.getText('VisualIns_MessageBoxSave'));
				return
			}
			let oMajorTile = sap.ui.core.Fragment.byId(ControlIds.VISUAL_ID.fragment_VisualInspectionTestStatusId, ControlIds.VISUAL_ID.TILE_MEJORID);
			let oMinorTile = sap.ui.core.Fragment.byId(ControlIds.VISUAL_ID.fragment_VisualInspectionTestStatusId, ControlIds.VISUAL_ID.TILE_MINORID);

			if (oMajorTile.getHeader() === Constant.VISUALCONSTANTS.ISSUETYPEMAJOR && oMajorTile.hasStyleClass("customMajorCard")) {
				oMajorTile.removeStyleClass("customMajorCard");
			}

			if (oMinorTile.getHeader() === Constant.VISUALCONSTANTS.ISSUETYPEMINOR && oMinorTile.hasStyleClass("customMinorCard")) {
				oMinorTile.removeStyleClass("customMinorCard");
			}

			let iCalculateFile = this.aClickedButton.length * Constant.VISUALCONSTANTS.CALCULATEATTCHFILE;
			let sDynamicMsg = this.oi18nModel.getText('VisualIns_fileSelectionLimit', iCalculateFile);
			let sTitle = {
				msg: sDynamicMsg
			}
			let sTitleModel = new JSONModel(sTitle);
			this.getView().setModel(sTitleModel, 'TitleModel');

			const oFileModel = this.getView().getModel("FileUploadedVisualModel");
			if (!oFileModel) {
				this.onLoadCreateCaptureModel();
			}

			if (!this.fileUploadFlag) {
				this.fileUploadFlag = sap.ui.xmlfragment(ControlIds.VISUAL_ID.fragment_VisualFilesUploadFrag, "adnoc.vi.vehicleinspection.modone.fragment.view.VisualFilesUpload", this);
				this.getView().addDependent(this.fileUploadFlag);
			}

			let oUploadFileName = sap.ui.core.Fragment.byId(ControlIds.VISUAL_ID.fragment_VisualFilesUploadFrag, 'FileBrowsId');

			this.fileUploadFlag.open();
			setTimeout(function () {
				oUploadFileName.clear();
			}, 100);


		},

		/**
			* Functon for open fragment.
			* @memberof adnoc.vi.vehicleinspection.modone.controller.VisualInspection
			* @version 1.0.0
			* @since 09.05.2025
			* @fires onBtnPressFileUploadVisual
			* @author MA
		*/
		onLoadCreateCaptureModel: async function () {

			let oFileUploaded = { FileCategory: [{}] };
			oFileUploaded.FileCategory = oFileUploaded.FileCategory.map((item, index) => {
				return {
					ButtonId: index,
					attachmentName: null,
					InputValue: null
				};
			});
			let model = new JSONModel(oFileUploaded);
			this.getView().setModel(model, 'FileUploadedVisualModel');

		},

		/**
		 * This function is Open Camera fragment for Capture Image 
		 * @memberof  adnoc.vi.vehicleinspection.modone.controller.VisualInspection
		 * @version 1.0.0
		 * @since 19.05.2025
		 * @fires 
		 * @author MA
		 */
		onCaptureImageForVisual: function () {
			const that = this;
			// Create camera dialog if not already created
			if (!this._cameraDialog) {
				this._cameraDialog = sap.ui.xmlfragment(ControlIds.VISUAL_ID.fragment_CameraCapture, "adnoc.vi.vehicleinspection.modone.fragment.view.CameraCapture", this);
				this.getView().addDependent(this._cameraDialog);
			}

			// Reset image view
			const oImage = this.getView().byId(ControlIds.VISUAL_ID.CAPTUREIMAGE);
			oImage.setSrc("");
			oImage.setVisible(false);
			const oTakePhotoButton = this.getView().byId(ControlIds.VISUAL_ID.BTNTAKEPHOTOPERMIT);

			oTakePhotoButton.setEnabled(true)
			// Open dialog first
			this._cameraDialog.open();

			// Delay to ensure DOM elements are rendered
			setTimeout(async () => {
				that._stopCameraStream(); // Ensure old stream is stopped

				try {
					const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" }, audio: false });
					that._cameraStream = stream;

					const videoElement = document.getElementById(ControlIds.VISUAL_ID.CAMERASTREAM);
					if (videoElement) {
						videoElement.srcObject = stream;
						videoElement.style.display = "block";
						videoElement.play();
					}
				} catch (err) {
					MessageBox.error(this.oi18nModel.getText('VisualIns_MessageBoxErrorCmrAccess') + err.message);
				}
			}, 500);
		},

		/**
		 * This function is stop the Camera Stream
		 * @memberof  adnoc.vi.vehicleinspection.modone.controller.VisualInspection
		 * @version 1.0.0
		 * @since 19.05.2025
		 * @fires 
		 * @author MA
		 */
		_stopCameraStream: function () {
			if (this.stream) {
				this.stream.getTracks().forEach(track => track.stop());
				this.stream = null;
			}
		},

		/**
		 * This function is create payload for Attachment
		 * @memberof  adnoc.vi.vehicleinspection.modone.controller.VisualInspection
		 * @version 1.0.0
		 * @since 19.05.2025
		 * @fires _readFileAsBase64Multiple
		 * @author MA
		 */
		onSavePayloadforAttch: async function (ofile) {
			let bFlag = this.onclickValidation();
			if (bFlag) {
				MessageToast.show(this.oi18nModel.getText('VisualIns_MessageBoxValidationLimitAttach'));
				return
			}
			if (!this.oVisualfile) {
				this.oVisualfile = {
					FileCategory: []
				};
			};

			if (ofile.mParameters) {
				ofile = ofile.mParameters.files[0]
			}


			let base64 = await new Promise((resolve) => {
				this._readFileAsBase64Multiple(ofile, resolve);
			});

			let Files = {
				attachmentGuId: null,
				attachmentName: ofile.name,
				orgFileName: ofile.name.split('.', 1)[0],
				orgFileExtension: ofile.name.split('.').pop(),
				docType: null,
				docId: this.oSetSubcategory[0].testSubTypeNo,
				docGuid: this.oSetSubcategory[0].testSubTypeTextEnglish,
				base64File: base64
			};
			this.oVisualfile.FileCategory.push(Files);
			let DataModel = new sap.ui.model.json.JSONModel(this.oVisualfile);

			this.oVisualfile.FileCategory.forEach(Item => {
				this.getView().getModel("FileUploadedVisualModel").setProperty('/FileCategory/0/attachmentName', Item.attachmentName);
			});

			this.getView().setModel(DataModel, "FileUploadedArrayModel");
			let aFileUploadedArray = this.getView().getModel('FileUploadedArrayModel').getData();
			aFileUploadedArray.FileCategory.forEach((Item, Index) => {
				this.getView().getModel('FileUploadedArrayModel').setProperty(`/FileCategory/${Index}/SRNo`, Index + 1);
			});

		},

		/**
		 * This function use for delete file from attachment.
		 * @memberof  adnoc.vi.vehicleinspection.modone.controller.VisualInspection
		 * @version 1.0.0
		 * @since 19.05.2025
		 * @fires _readFileAsBase64Multiple
		 * @author MA
		 */
		onDeleteFile: async function (oEvent) {
			MessageBox.confirm(
				this.oi18nModel.getText('VisualIns_MessageBoxValiddationDeleteFile'), {
				icon: MessageBox.Icon.INFORMATION,
				title: this.oi18nModel.getText('VisualIns_MessageBoxTitle'),
				class: "sapUiSizeCompact",
				actions: [MessageBox.Action.YES, MessageBox.Action.NO],
				onClose: function (oAction) {
					if (oAction === Constant.YESANDNO.YES) {
						var oDeletedItem = oEvent.getParameter("listItem");
						var oList = oEvent.getSource();
						var oModel = this.getView().getModel("FileUploadedArrayModel");
						var sPath = oDeletedItem.getBindingContext("FileUploadedArrayModel").getPath();
						var aData = oModel.getProperty("/FileCategory");
						var iIndex = parseInt(sPath.split("/")[2]);
						aData.splice(iIndex, 1);
						oModel.setProperty("/FileCategory", aData);
					}
				}.bind(this)
			});
		},

		/**
	   * Functon for Generate Base64 Structure for Attachment
	   * @memberof adnoc.vi.vehicleinspection.modone.controller.VisualInspection
	   * @version 1.0.0
	   * @since 09.05.2025
	   * @fires _readFileAsBase64Multiple
	   * @author MA
	   */
		_readFileAsBase64Multiple: function (file, callback) {

			const ofReader = new FileReader();
			ofReader.onload = function (event) {
				const base64String = event.target.result.split(",")[1]; // Get Base64 part of the string
				callback(base64String);
			};
			ofReader.onerror = function (error) {
				MessageBox.error(this.oi18nModel.getText(this.oi18nModel.getText("VisualIns_MessageBoxForReadingFile")) + file.name);
			};
			ofReader.readAsDataURL(file); // Read file as Data URL

		},

		/**
	   * Functon for take Photo
	   * @memberof adnoc.vi.vehicleinspection.modone.controller.VisualInspection
	   * @version 1.0.0
	   * @since 09.05.2025
	   * @fires _readFileAsBase64Multiple
	   * @author MA
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

				// const iCurrentCategoryIndex = that._currentUploadIndex; // ← You must set this before opening the camera

				that.isCameraCaptured(file);
				that.onSavePayloadforAttch(file);
				MessageToast.show(Constant.VISUALCONSTANTS.TAKEPHOTOMSG);
				that.onCloseCameraDialog(); // Optional: close after capture
			}, "image/jpeg");
		},

		/**
		* Functon for is Image Captured or Not ?
		* @memberof adnoc.vi.vehicleinspection.modone.controller.VisualInspection
		* @version 1.0.0
		* @since 09.05.2025
		* @fires isCameraCaptured
		* @author MA
		*/
		isCameraCaptured: function (aFiles) {
			return Array.isArray(aFiles) && aFiles.some(file => file.source === "camera") ? "Accept" : "Transparent";
		},

		/**
		   * Functon for clase fragment.
		   * @memberof adnoc.vi.vehicleinspection.modone.controller.VisualInspection
		   * @version 1.0.0
		   * @since 09.05.2025
		   * @fires onBtnPressFileUploadVisual
		   * @author MA
		*/
		onBtnPressCloseFileUpload: function () {
			this.fileUploadFlag.close();
		},

		/**
		* Functon for Open Camera in Fragment
		* @memberof adnoc.vi.vehicleinspection.modone.controller.VisualInspection
		* @version 1.0.0
		* @since 09.05.2025
		* @fires onOpenCameraDialog,onCaptureImage
		* @author MA
		*/
		onOpenCameraDialog: function (oEvent) {
			let bFlag = this.onclickValidation();
			if (bFlag) {
				MessageToast.show(this.oi18nModel.getText('VisualIns_MessageBoxValidationLimitAttach'));
				return
			}
			const oContext = oEvent.getSource().getBindingContext("FileUploadedVisualModel");
			const iIndex = oContext.getPath().split("/").pop();

			this._currentUploadIndex = iIndex; // Store index for later

			// Now open the camera dialog
			this.onCaptureImage();
		},

		/**
		* Functon for Captured Image from Camera
		* @memberof adnoc.vi.vehicleinspection.modone.controller.VisualInspection
		* @version 1.0.0
		* @since 09.05.2025
		* @fires onCaptureImage
		* @author MA
		*/
		onCaptureImage: function () {
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
						MessageBox.error(VisualIns_MessageBoxCameraAccess + ' ' + err.message);
					});
			}, 500); // Delay for dialog rendering
		},

		/**
	   * Functon for Close Camera Dialog
	   * @memberof adnoc.vi.vehicleinspection.modone.controller.VisualInspection
	   * @version 1.0.0
	   * @since 09.05.2025
	   * @fires onCloseCameraDialog
	   * @author MA
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
		* Functon for Final Structure for Attachment
		* @memberof adnoc.vi.vehicleinspection.modone.controller.VisualInspection
		* @version 1.0.0
		* @since 09.05.2025
		* @fires onBtnPressSaveAttachmentFiles,onBtnPressCloseFileUpload
		* @author MA
		*/
		onBtnPressSaveAttachmentFiles: function () {
			let oFileUploadModel = this.getView().getModel("FileUploadedVisualModel");
			let oFIleUploadData = oFileUploadModel.getData();
			oFileUploadModel.refresh(true);
			if (oFIleUploadData.FileCategory.length != 0) {
				this.onBtnPressCloseFileUpload();
			}
		},

		/**
		* Functon use for Save the click for validation.
		* @memberof adnoc.vi.vehicleinspection.modone.controller.VisualInspection
		* @version 1.0.0
		* @since 09.05.2025
		* @fires onBtnPressSaveAttachmentFiles,onBtnPressCloseFileUpload
		* @author MA
		*/
		onImageButtonPress: function (oEvent) {
			let oButton = oEvent.getSource();
			if (!this.SideButtonsHolder) {
				this.SideButtonsHolder = [];
			}
			let data = { ButtonControl: oButton }
			this.SideButtonsHolder.push(data);
			// Ensure array exists
			if (!this.aClickedButton) {
				this.aClickedButton = [];
			}

			// Collect button's custom data
			let allCustomData = oButton.getCustomData();
			let sClickedButton = allCustomData.map(oData => ({
				Key: oData.getKey(),
				Value: oData.getValue(),
			}))[0];

			// Check if this button already exists in the array
			let iIndex = this.aClickedButton.findIndex(
				btn => btn.Key === sClickedButton.Key && btn.Value === sClickedButton.Value
			);

			if (iIndex === -1) {
				// Not in array → Activate button
				oButton.addStyleClass("active");
				oButton.setType("Emphasized"); // highlight color
				this.aClickedButton.push(sClickedButton);
			} else {
				// Already in array → Deactivate button
				oButton.removeStyleClass("active");
				oButton.setType("Default"); // back to default
				this.aClickedButton.splice(iIndex, 1); // remove from array
			}
			this.oSubChildSelect = this.aClickedButton;
			let oVehicleSideSelected = new JSONModel(this.oSubChildSelect);
			this.getView().setModel(oVehicleSideSelected, 'VehicleSideSelectedModel');
			let oTextAreaInut = sap.ui.core.Fragment.byId(ControlIds.VISUAL_ID.fragment_VisualInspectionTestStatusId, ControlIds.VISUAL_ID.fragment_txtCategoryRemarks);
			let oMinorTile = sap.ui.core.Fragment.byId(ControlIds.VISUAL_ID.fragment_VisualInspectionTestStatusId, ControlIds.VISUAL_ID.TILE_MINORID);
			let oMajorTile = sap.ui.core.Fragment.byId(ControlIds.VISUAL_ID.fragment_VisualInspectionTestStatusId, ControlIds.VISUAL_ID.TILE_MEJORID);
			let oAddFileFile = sap.ui.core.Fragment.byId(ControlIds.VISUAL_ID.fragment_VisualInspectionTestStatusId, ControlIds.VISUAL_ID.BTNADDTILEFILE);
			oMinorTile.removeStyleClass("disabledItem");
			oMajorTile.removeStyleClass("disabledItem");
			oAddFileFile.removeStyleClass("disabledItem");
			oTextAreaInut.setEditable(true);

			if (oTextAreaInut) {
				oTextAreaInut.setValue('');
			}
			this.onLoadApplyTileColors(null);
		},

		/**
		* Functon use for Save the click for validation.
		* @memberof adnoc.vi.vehicleinspection.modone.controller.VisualInspection
		* @version 1.0.0
		* @since 09.05.2025
		* @fires onBtnPressSaveAttachmentFiles,onBtnPressCloseFileUpload
		* @author MA
		*/
		onViewFileVisual: async function (oEvent) {
			let oButton = oEvent.getSource();
			let oContext = oButton.getBindingContext("FileUploadedArrayModel");
			let oRowData = oContext.getObject();
			let oPayload = { attachmentGuId: oRowData.attachmentGuId }
			if (oRowData.attachmentGuId) {
				await this.createNewModelUsingAPI('POST', `/getAttachmentByGuid`,
					oPayload,
					'FatchAttachmentModel'
				);
				let AttachmentData = this.getView().getModel('FatchAttachmentModel').getData();
				oRowData = AttachmentData.getAttachmentByGuid;
			}
			this.displayAttachment(oRowData);
		},

		/**
		* Functon use for show the attachment
		* @memberof adnoc.vi.vehicleinspection.modone.controller.VisualInspection
		* @version 1.0.0
		* @since 09.05.2025
		* @fires displayAttachment
		* @author MA
		*/
		displayAttachment: function (attachmentData) {
			if (!attachmentData.base64File || !attachmentData.orgFileExtension) {
				MessageToast.show(this.oi18nModel.getText("VisualIns_MessageBoxForInvalidAttachment"));
				return;
			}

			let sBase64 = attachmentData.base64File;
			let sFileType = attachmentData.orgFileExtension;

			let byteCharacters = atob(sBase64);
			let byteNumbers = Array.from(byteCharacters, char => char.charCodeAt(0));
			let byteArray = new Uint8Array(byteNumbers);
			let blob = new Blob([byteArray], { type: 'application/pdf' });
			let sBlobUrl = URL.createObjectURL(blob);

			if (sFileType === Constant.VISUALCONSTANTS.FILETYPEBDP) {
				var oPDFViewer = new PDFViewer();
				this.getView().addDependent(oPDFViewer);
				oPDFViewer.setSource(sBlobUrl);
				oPDFViewer.open();
			}
			else if (Constant.FILETYPE.includes(sFileType.toLowerCase())) {
				const oDialog = new Dialog({
					title: this.oi18nModel.getText("visualIns_TitleViewAttachment"),
					content: new sap.m.Image({
						src: sBlobUrl,
						width: Constant.VEHICLECONSTANT.WIDTH,
						height: Constant.VEHICLECONSTANT.HEIGHT
					}),
					endButton: new sap.m.Button({
						text: this.oi18nModel.getText("Close"),
						press: function () {
							oDialog.close(); // Use the dialog instance directly
						}
					})
				});

				// Open the dialog
				oDialog.open();
			}
			else {
				MessageToast.show(this.oi18nModel.getText("VisualIns_MessageBoxUnsupported"));
			}
		},

		/**
		* Functon use for Download File clock on downlaod button
		* @memberof adnoc.vi.vehicleinspection.modone.controller.VisualInspection
		* @version 1.0.0
		* @since 09.05.2025
		* @fires onDownloadFileHandler
		* @author MA
		*/
		onDownloadFileHandler: async function (oEvent) {
			let oBindingContext = null;
			oBindingContext = oEvent.getSource().getBindingContext("ViewUploadModel");
			if (!oBindingContext) {
				oBindingContext = oEvent.getSource().getBindingContext("FileUploadedArrayModel");
			}
			let oSelectedAttachment = oBindingContext.getObject();
			let sGetGuid = oSelectedAttachment.attachmentGuId;
			if (!sGetGuid) {
				sGetGuid = oSelectedAttachment.attachmentGuId_attachmentGuId
			}
			if (!oSelectedAttachment || !sGetGuid) {
				MessageToast.show(this.oi18nModel.getText("VisualIns_MessageBoxForMissing"));
				return;
			}

			// Proceed with the selected attachment
			let payload = {
				"attachmentGuId": sGetGuid
			};
			// API call to fetch the attachment data
			await this.createNewModelUsingAPI(
				"POST",
				"/getAttachmentByGuid",
				payload,
				"downloadAttachModel"
			);
			const res = this.getApiResponseObject();
			if (res.success) {
				this.downloadAttachmentData(res.object);
			} else {
				MessageBox.error(res.object.responseJSON.error.value || this.oi18nModel.getText("VisualIns_MessageBoxForFailed"));
			}
		},

		/**
	   * Functon use for Download File 
	   * @memberof adnoc.vi.vehicleinspection.modone.controller.VisualInspection
	   * @version 1.0.0
	   * @since 09.05.2025
	   * @fires downloadAttachmentData
	   * @author MM
	   */
		downloadAttachmentData: function (downloaData) {
			let sBase64 = downloaData.getAttachmentByGuid.base64File;
			let sFileType = downloaData.getAttachmentByGuid.orgFileExtension;
			let actualFileName = downloaData.getAttachmentByGuid.attachmentName;

			// Convert base64 to binary (Blob)
			let byteCharacters = atob(sBase64);
			let byteNumbers = new Array(byteCharacters.length);
			for (var i = 0; i < byteCharacters.length; i++) {
				byteNumbers[i] = byteCharacters.charCodeAt(i);
			}
			let byteArray = new Uint8Array(byteNumbers);
			let blob = new Blob([byteArray], { type: sFileType });
			// Create a Blob URL and trigger download
			let sBlobUrl = URL.createObjectURL(blob);
			let aLink = document.createElement('a');
			aLink.href = sBlobUrl;
			aLink.download = actualFileName; // Assuming file extension is part of sFileType
			aLink.click(); o
			MessageToast.show(this.oi18nModel.getText("VisualIns_MessageBoxForDownload"));
		},

		/**
		* Functon for Download File
		* @memberof adnoc.vi.vehicleinspection.modone.controller.VisualInspection
		* @version 1.0.0
		* @since 09.05.2025
		* @fires downloadAttachmentData
		* @author MA
		*/
		onLoadSaveAttachment: async function () {
			let aAttachmentData = this.aAttachmentPayload;
			if (!aAttachmentData) {
				return;
			}
			let oPayload = {
				Files: aAttachmentData
			}
			if (oPayload.Files.length > 0) {
				await this.createNewModelUsingAPI('POST', '/uploadAttachment', oPayload, 'AttachmentModel');
				let oModel = this.getView().getModel('AttachmentModel');
				if (oModel) {
					let oData = oModel.getData();
					this.onCloseVIStatusf4();
					if (this.aClickedButton)
						this.aClickedButton = [];
					this.onLoadApplyTileColors(null);
					return oData;
				} else {
					return oPayload;
				}
			} else {
				return oPayload;
			}

		},

		/** Function use for validation for attachment Visual file  uplaod fragment 
		* @memberof adnoc.vi.vehicleinspection.modone.controller.VisualInspection
		* @version 1.0.0
		* @since 09.17.2025
		* @author MA
		* @fires
		*/
		onclickValidation: function () {
			let iLengthclicked = this.aClickedButton.length * Constant.VISUALCONSTANTS.CALCULATEATTCHFILE;
			let ilengthAttachment = this.getView().getModel('FileUploadedArrayModel').getData();
			if (Object.keys(ilengthAttachment).length > 0) {
				if (ilengthAttachment.FileCategory.length == iLengthclicked) {
					return true;
				}
			}
		},

		/** Function for call the fcuntion on the clear button
		* @memberof adnoc.vi.vehicleinspection.modone.controller.VisualInspection
		* @version 1.0.0
		* @since 09.17.2025
		* @author MA
		* @fires
		*/
		onBtnPressClearData: function () {
			sap.m.MessageBox.confirm(this.oi18nModel.getText('VisualIns_MessageBoxConfirmMsg'), {
				icon: sap.m.MessageBox.Icon.CONFIRM,
				title: this.oi18nModel.getText('VisualIns_MessageBoxConfirm'),
				actions: [sap.m.MessageBox.Action.YES, sap.m.MessageBox.Action.NO],
				onClose: function (oAction) {
					if (oAction === Constant.YESANDNO.YES) {
						this.onLoadClearData();
						this.onLoadApplyTileColors(null)
					} else if (oAction === Constant.YESANDNO.NO) {

					}
				}.bind(this)
			});
		},

		/** Function for clear the data from model 
		* @memberof adnoc.vi.vehicleinspection.modone.controller.VisualInspection
		* @version 1.0.0
		* @since 09.17.2025
		* @author MA
		* @fires
		*/
		onLoadClearData: function () {
			let aButtionsIds = ControlIds.VISUALBUTTONSID;
			aButtionsIds.forEach(Ids => {
				let sButton = sap.ui.core.Fragment.byId(ControlIds.VISUAL_ID.fragment_VisualInspectionTestStatusId, Ids);
				if (sButton) {
					sButton.removeStyleClass("active");
					sButton.setType("Default");
				}

			})
			//Now this code not use 
			// let oMinorTile = sap.ui.core.Fragment.byId(ControlIds.VISUAL_ID.fragment_VisualInspectionTestStatusId, ControlIds.VISUAL_ID.TILE_MINORID);
			// let oMajorTile = sap.ui.core.Fragment.byId(ControlIds.VISUAL_ID.fragment_VisualInspectionTestStatusId, ControlIds.VISUAL_ID.TILE_MEJORID);

			if (this.oSubChildSelect) {
				this.oSubChildSelect = [];
			}

			let EmptyModel = new JSONModel();
			this.getView().setModel(EmptyModel, 'FileUploadedArrayModel');
			let FileAttachmentData = this.getView().getModel('FileUploadedVisualModel');
			if (FileAttachmentData) {
				FileAttachmentData.setProperty("/FileCategory/0/", {});//set empty object in the model
			}

			var oFileUploader = sap.ui.core.Fragment.byId(ControlIds.VISUAL_ID.fragment_VisualFilesUploadFrag, ControlIds.VISUAL_ID.fragment_FILEBROWSEID);
			if (this.SideButtonsHolder) {
				this.SideButtonsHolder.forEach(Item => {
					Item.ButtonControl.removeStyleClass("active");
					Item.ButtonControl.setType("Default");
				});
			}
			let oTextAreaInut = sap.ui.core.Fragment.byId(ControlIds.VISUAL_ID.fragment_VisualInspectionTestStatusId, ControlIds.VISUAL_ID.fragment_txtCategoryRemarks);
			if (oTextAreaInut) {
				oTextAreaInut.setValue('');
			}

		},

		/** Function for make fress the payload for attachment
		* @memberof adnoc.vi.vehicleinspection.modone.controller.VisualInspection
		* @version 1.0.0
		* @since 09.17.2025
		* @author MA
		* @fires
		*/
		onLoadAttachmentCreatePayload: function (oEvent) {
			let oManagedData = null
			if (!this.aAttachmentPayload) {
				this.aAttachmentPayload = [];
			}
			if (!oEvent.getSource().mEventRegistry.press[0].oListener.object1) {
				oManagedData = this.oClockEditButton
			} else {
				oManagedData = oEvent.getSource().mEventRegistry.press[0].oListener.object1.testSubTypeNo
			}

			if (this.oVisualfile) {
				this.oVisualfile.FileCategory.forEach((data, index) => {
					if (data.attachmentGuId == null) {
						let Files = {
							attachmentGuId: data.attachmentGuId,
							attachmentName: data.attachmentName,
							orgFileName: data.orgFileName,
							orgFileExtension: data.orgFileExtension,
							docType: data.docType,
							docId: this.oClockEditButton.testSubTypeNo,
							docGuid: this.oClockEditButton.testSubTypeTextEnglish,
							base64File: data.base64File
						};
						this.aAttachmentPayload.push(Files);
					}

				});
			}
		},
		//#endregion

		/** Function for Open Order
		* @memberof adnoc.vi.vehicleinspection.modone.controller.VisualInspection
		* @version 1.0.0
		* @since 09.17.2025
		* @author MA
		* @fires
		*/
		onPressOrderProcessing: function () {
			setTimeout(function () {
				var oRouter = UIComponent.getRouterFor(this);
				oRouter.navTo("RouteOrderProcessing", { fromScreen: "VisualScreen" });
			}.bind(this), 2000);

		},

		/** Function use for manage color for minor and major tiles 
		* @memberof adnoc.vi.vehicleinspection.modone.controller.VisualInspection
		* @version 1.0.0
		* @since 09.17.2025
		* @author MA
		* @fires
		*/
		onLoadApplyTileColors: function (oIdControl) {
			let oMinorTile = sap.ui.core.Fragment.byId(ControlIds.VISUAL_ID.fragment_VisualInspectionTestStatusId, ControlIds.VISUAL_ID.TILE_MINORID);
			let oMajorTile = sap.ui.core.Fragment.byId(ControlIds.VISUAL_ID.fragment_VisualInspectionTestStatusId, ControlIds.VISUAL_ID.TILE_MEJORID);
			if (oIdControl)
				var oClickTile = oIdControl.getId();
			if (oMinorTile.getId() === oClickTile) {
				oIdControl.addStyleClass("customMinorCard");
				oMajorTile.removeStyleClass("customMajorCard");
			} else if (oMajorTile.getId() === oClickTile) {
				oIdControl.addStyleClass("customMajorCard");
				oMinorTile.removeStyleClass("customMinorCard");
			} else {
				oMinorTile.removeStyleClass("customMinorCard");
				oMajorTile.removeStyleClass("customMajorCard");
			}
		},

		/** Function for fragment close and clear data from fragment 
		* @memberof adnoc.vi.vehicleinspection.modone.controller.VisualInspection
		* @version 1.0.0
		* @since 09.17.2025
		* @author MA
		* @fires
		*/
		onBtnPressExist: function () {
			sap.m.MessageBox.confirm(this.oi18nModel.getText('VisualIns_MessageBoxConfirmMsg'), {
				icon: sap.m.MessageBox.Icon.CONFIRM,
				title: this.oi18nModel.getText('VisualIns_MessageBoxConfirm'),
				actions: [sap.m.MessageBox.Action.YES, sap.m.MessageBox.Action.NO],
				onClose: function (oAction) {
					if (oAction === Constant.YESANDNO.YES) {
						this.onLoadClearData();
						this.onLoadApplyTileColors(null);
						this.VIStatusFrag.close();
					} else if (oAction === Constant.YESANDNO.NO) {

					}
				}.bind(this)
			});
		},

		/** Function for navigate order screen from Visual Inspection after save or comfirm
		* @memberof adnoc.vi.vehicleinspection.modone.controller.VisualInspection
		* @version 1.0.0
		* @since 09.17.2025
		* @author MA
		* @fires
		*/
		onBtnPressVisualInspectionExist: function () {
			var oRouter = UIComponent.getRouterFor(this);
			oRouter.navTo("RouteOrderProcessing", { fromScreen: "VisualScreen" });
		},

		/** Function use for validation test status fragment 
		* @memberof adnoc.vi.vehicleinspection.modone.controller.VisualInspection
		* @version 1.0.0
		* @since 09.17.2025
		* @author MA
		* @fires
		*/
		onLoadTilesValidation: function (TilesAccess) {
			let validFlag = true;

			let sRemarks = sap.ui.core.Fragment.byId(ControlIds.VISUAL_ID.fragment_VisualInspectionTestStatusId, ControlIds.VISUAL_ID.fragment_txtCategoryRemarks).getValue();
			if (TilesAccess.getHeader() === Constant.VISUALCONSTANTS.ISSUETYPEMAJOR && ((sRemarks === null) || (sRemarks === undefined) || (sRemarks === ''))) {
				MessageToast.show(this.oi18nModel.getText('VisualIns_Valid_Remarks'));
				TilesAccess.removeStyleClass("customMajorCard");
				return validFlag = false;
			}
			return validFlag;
		},

		/** Function use for make the payload for visual test (main payload)
		* @memberof adnoc.vi.vehicleinspection.modone.controller.VisualInspection
		* @version 1.0.0
		* @since 09.17.2025
		* @author MA
		* @fires
		*/
		onLoadCreatePayload: function (oTile, oEvent) {
			var objModel = this.getView().getModel('SearchViewModel').getData();
			let aSelectedSide = this.getView().getModel('VehicleSideSelectedModel');
			let VisualInitializeModel = this.getView().getModel("VisualInitializeModel");
			if (!aSelectedSide && !this.oSubChildSelect) {
				return
			}
			if (!aSelectedSide || !aSelectedSide.getData() || Object.keys(aSelectedSide.getData()).length === 0) {
				aSelectedSide.setData(this.oSubChildSelect);
			}
			let aAllSide = objModel.surajDefectData[0].SubCategory[0].ChildSubCategory;
			let aSelectedVehicleSide = aAllSide.filter(Item => aSelectedSide.getData().some(Element => Item.testTypeTextEnglish === Element.Value));
			const aSelectedVehicleMareg = aSelectedVehicleSide.concat(aSelectedSide.getData());
			let filteredValue = aSelectedVehicleMareg.filter(obj => !("Key" in obj && "Value" in obj));
			filteredValue = filteredValue.filter(Item => Item.testTypeCombinationUUID != null)

			this.oClockEditButton = oEvent.getSource().mEventRegistry.press[0].oListener.object1;
			if (!this.oClockEditButton) {
				this.oClockEditButton = VisualInitializeModel.getProperty("/SelectedSubcategory");
			}
			this.aPreviousAttachment;
			let aCreatePayload = [];
			filteredValue.forEach(Item => {
				var oPayload = {
					Remarks: objModel.remarksValue,
					issueType: oTile.getHeader(),
					testTypeKey: Item.testTypeNo,
					testTypeTextArabic: Item.testTypeTextArabic,
					testTypeTextEnglish: Item.testTypeTextEnglish
				}
				aCreatePayload.push(oPayload);
			});

			let bValidationDuplicateData = true;
			if (this.oParentPayLoad) {
				this.oParentPayLoad.forEach((Item, index) => {
					let sExaminationMethod = Item.examinationMethodEnglish === objModel.surajDefectData[objModel.catSelectedIndex].examinationMethodEnglish;
					let sTestSubTypeTextEnglish = Item.testSubTypeTextEnglish === this.oClockEditButton.testSubTypeTextEnglish;
					if (sExaminationMethod && sTestSubTypeTextEnglish) {
						bValidationDuplicateData = false;
						aCreatePayload.forEach(ButtionText => {
							let bDuplicate = this.oParentPayLoad[index].testResVsSDtl.some(Item => Item.testTypeTextEnglish === ButtionText.testTypeTextEnglish);
							if (!bDuplicate) {
								this.oParentPayLoad[index].testResVsSDtl.push(ButtionText);
							}
						});
					}
				});
			}
			if (bValidationDuplicateData) {
				this.oParentPayLoad.push({
					examinationMethodArabic: objModel.surajDefectData[objModel.catSelectedIndex].examinationMethodArabic,
					examinationMethodEnglish: objModel.surajDefectData[objModel.catSelectedIndex].examinationMethodEnglish,
					testMainTypeNo: objModel.surajDefectData[objModel.catSelectedIndex].testMainTypeNo,
					testMainTypeTextArabic: objModel.surajDefectData[objModel.catSelectedIndex].testMainTypeTextArabic,
					testMainTypeTextEnglish: objModel.surajDefectData[objModel.catSelectedIndex].testMainType,
					testMaterialCode: VisualInitializeModel.getData().materialCode,
					testSubTypeNo: this.oClockEditButton.testSubTypeNo,
					testSubTypeTextArabic: this.oClockEditButton.testSubTypeTextArabic,
					testSubTypeTextEnglish: this.oClockEditButton.testSubTypeTextEnglish,
					testResVsSDtl: aCreatePayload
				});
			}
			this.oParentPayLoad.forEach(Item => {
				Item.testResVsSDtl = Item.testResVsSDtl.filter(Obc => {
					let keys = Object.keys(Obc);
					return !(keys.length === 2 && keys.includes("Key") && keys.includes("Value"));
				});
			});

			VisualInitializeModel.setProperty("/LinesDefect", this.oParentPayLoad);
			this.getView().getModel("SearchViewModel").refresh();
			let oJSONModelData = new JSONModel();
			this.getView().setModel(oJSONModelData, 'VehicleSideSelectedModel');
		},

		/** Function use for close the Visual Status fragment  
		* @memberof adnoc.vi.vehicleinspection.modone.controller.VisualInspection
		* @version 1.0.0
		* @since 09.17.2025
		* @author MA
		* @fires
		*/
		onBtnPressSaveTestStatus: function (event) {
			if (!this.aClickedButton || !this.aClickedButton.length > 0) {
				MessageBox.warning(this.oi18nModel.getText('VisualIns_MessageValid'));
			} else {
				let oMinorTile = sap.ui.core.Fragment.byId(ControlIds.VISUAL_ID.fragment_VisualInspectionTestStatusId, ControlIds.VISUAL_ID.TILE_MINORID);
				let oMajorTile = sap.ui.core.Fragment.byId(ControlIds.VISUAL_ID.fragment_VisualInspectionTestStatusId, ControlIds.VISUAL_ID.TILE_MEJORID);
				let sRemarks = sap.ui.core.Fragment.byId(ControlIds.VISUAL_ID.fragment_VisualInspectionTestStatusId, ControlIds.VISUAL_ID.fragment_txtCategoryRemarks).getValue();
				if (oMinorTile.hasStyleClass('customMinorCard') || oMajorTile.hasStyleClass("customMajorCard")) {
					if (oMajorTile.getHeader() == Constant.VISUALCONSTANTS.ISSUETYPEMAJOR &&
						(sRemarks === null || sRemarks === '' || sRemarks === undefined) && oMajorTile.hasStyleClass("customMajorCard")) {
						MessageToast.show(this.oi18nModel.getText('VisualIns_Valid_Remarks'));
						oMajorTile.removeStyleClass("customMajorCard");

					} else {
						this.onCloseVIStatusf4();
						if (this.aClickedButton) {
							this.aClickedButton = [];
						}
						this.oSetSubcategory = [];
					}
				} else {
					MessageToast.show(this.oi18nModel.getText('visualIns_MessageShowValid'));
				}
			}
		},

		/** Function use for remove SubCategory 
		* @memberof adnoc.vi.vehicleinspection.modone.controller.VisualInspection
		* @version 1.0.0
		* @since 09.17.2025
		* @author MA
		* @fires
		*/
		onLoadRemoveSubOrMainCategory: function (oSubCategory) {
			this.oParentPayLoad.forEach((Item, SubCategoriIndex) => {
				if (Item.testSubTypeTextEnglish === oSubCategory.testSubTypeTextEnglish) {
					this.oParentPayLoad.splice(SubCategoriIndex, 1);
				} if (Item.testMainTypeTextEnglish === oSubCategory.testMainType) {
					this.oParentPayLoad.splice(SubCategoriIndex, 1);
				}
			});
		},

		/** Function use for open the view upload fragment  
		* @memberof adnoc.vi.vehicleinspection.modone.controller.VisualInspection
		* @version 1.0.0
		* @since 10.06.2025
		* @author MA
		* @fires
		*/
		onBtnPressPressViewFiles: function () {
			let oCountAttachData = this.getView().getModel('ViewUploadModel');
			if (oCountAttachData) {
				let oAttachmentData = [];
				let filterData = oCountAttachData.getData();
				oAttachmentData = filterData.filter(Item => { return Item.testResvslAtt.length != 0 });
				oAttachmentData.forEach((Item, Index) => {
					oAttachmentData[Index].SRNo = Index + 1;
					Item.testResvslAtt.forEach((att, AttachIndex) => {
						att.SRNo = AttachIndex + 1;
					})
				});
				let oFilterModel = new JSONModel(oAttachmentData);
				this.getView().setModel(oFilterModel, 'ViewUploadModel');
			}

			if (!this.ViewFileFlag) {
				this.ViewFileFlag = sap.ui.xmlfragment('VisualViewFilesId', "adnoc.vi.vehicleinspection.modone.fragment.view.VisualViewFiles", this);
				this.getView().addDependent(this.ViewFileFlag);
			}
			this.ViewFileFlag.open();
		},

		/** Function use for close the view upload fragment  
		* @memberof adnoc.vi.vehicleinspection.modone.controller.VisualInspection
		* @version 1.0.0
		* @since 10.06.2025
		* @author MA
		* @fires
		*/
		onBtnPressCloseViewFiles: function () {
			this.ViewFileFlag.close();
		},

		/** Function use for Make the payload for attachment 
		* @memberof adnoc.vi.vehicleinspection.modone.controller.VisualInspection
		* @version 1.0.0
		* @since 10.06.2025
		* @author MA
		* @fires
		*/
		onloadPushAttachmentPayload: async function (oAttachmentData) {
			let sTestCharUUID = this.getView().getModel("VisualInitializeModel").getProperty("/VehicleOrderInspectionLinesTestCharUUID");
			let aAttachUpdateP = [];

			if (oAttachmentData?.results && oAttachmentData.results.length > 0) {
				oAttachmentData.results.forEach(Item => {
					let sTestSubTypeNo = Item.docId;
					let sDocGuid = Item.docGuid;
					let iMatchedIndex = this.oParentPayLoad.findIndex(parentItem => Number(parentItem.testSubTypeNo) === sTestSubTypeNo && parentItem.testSubTypeTextEnglish == sDocGuid);
					if (iMatchedIndex !== -1) {
						if (!this.oParentPayLoad[iMatchedIndex].testResVsSDtl[0].testResvslAtt) {
							this.oParentPayLoad[iMatchedIndex].testResVsSDtl[0].testResvslAtt = [];
						}
						let data = {
							attachmentGuId_attachmentGuId: Item.attachmentGuId
						}
						this.oParentPayLoad[iMatchedIndex].testResVsSDtl[0].testResvslAtt.push(data);
					}
					aAttachUpdateP.push({ attachmentGuId: Item.attachmentGuId, docGuid: sTestCharUUID });
				});
			}
		},

		/** Function use for View Attachment fro View Upload fragment 
		* @memberof adnoc.vi.vehicleinspection.modone.controller.VisualInspection
		* @version 1.0.0
		* @since 10.06.2025
		* @author MA
		* @fires
		*/
		onBtnPressVisualViewUpload: async function (oEvent) {
			let oRowData = null;
			var oViewAttachment = oEvent.getSource().getBindingContext("ViewUploadModel").getObject();
			if (oViewAttachment) {
				let oPayload = {
					"attachmentGuId": oViewAttachment.attachmentGuId
				};
				await this.createNewModelUsingAPI('POST', `/getAttachmentByGuid`,
					oPayload,
					'FatchAttachmentModel'
				);
				let AttachmentData = this.getView().getModel('FatchAttachmentModel').getData();
				oRowData = AttachmentData.getAttachmentByGuid;
			}
			this.displayAttachment(oRowData);

		},

		/** Function use for Hide tab according to applicable  
		* @memberof adnoc.vi.vehicleinspection.modone.controller.VisualInspection
		* @version 1.0.0
		* @since 10.06.2025
		* @author MA
		* @fires
		*/
		onLoadHideTab: function () {
			let oGlobalModel = this.getView().getModel('oGlobalModel');
			let oEnableButtonData = this.getOwnerComponent().getModel('VisibleButtonsModel').getData();
			let bApplicableMaterial = oEnableButtonData.find(Item => {
				return (Item.applicableTestName === Constant.TESTTYPE.TRAFFIC) ||
					(Item.applicableTestName === Constant.TESTTYPE.ESMA) ||
					(Item.applicableTestName === Constant.TESTTYPE.COMPREHENSIVE) ||
					(Item.applicableTestName === Constant.TESTTYPE.MODIFIED)
			});


			oGlobalModel.setProperty("/isCOMTab", false);
			oGlobalModel.setProperty("/isESMATab", false);
			oGlobalModel.setProperty("/isTrafficTab", false);
			oGlobalModel.setProperty("/isModifiedTab", false);
			oGlobalModel.setProperty("/IsNotApplicableSmartForm", false);

			if (!bApplicableMaterial) {
				oGlobalModel.setProperty("/IsNotApplicableSmartForm", true);
				return
			}

			switch (bApplicableMaterial.applicableTestName) {
				case Constant.TESTTYPE.COMPREHENSIVE:
					oGlobalModel.setProperty("/isCOMTab", true);
					break;
				case Constant.TESTTYPE.ESMA:
					oGlobalModel.setProperty("/isESMATab", true);
					break;
				case Constant.TESTTYPE.TRAFFIC:
					oGlobalModel.setProperty("/isTrafficTab", true);
					break;
				case Constant.TESTTYPE.MODIFIED:
					oGlobalModel.setProperty("/isModifiedTab", true);
					break;
			}
		},

		/** Function used for tab validation — checks whether the Visual test and smart form is available. 
		* @memberof adnoc.vi.vehicleinspection.modone.controller.VisualInspection
		* @version 1.0.0
		* @since 10.06.2025
		* @author MA
		* @fires
		*/
		VisualTabValidation: async function () {
			let sCurrentTab = this.byId(ControlIds.VISUAL_ID.TabBarHeaderId).getSelectedKey();
			let oMsg = this.byId(ControlIds.VISUAL_ID.ValidMsgVboxId);
			let oVisualCheck = this.byId(ControlIds.VISUAL_ID.VboxflexContainerId);
			let oTextMartform = this.byId(ControlIds.VISUAL_ID.ValidationTextId)
			let oGlobalModel = this.getView().getModel('oGlobalModel');
			let aData = oGlobalModel.getProperty('/ServiceRowData');
			let bIsApplicable = aData.vehOrdInspLinesTestChars.results.some(Item => Item.applicableTestName === Constant.TESTTYPE.VISUAL);
			let bIsSmartApplicable = aData.vehOrdInspLinesTestChars.results.some(Item =>
				Item.applicableTestName === Constant.TESTTYPE.COMPREHENSIVE ||
				Item.applicableTestName === Constant.TESTTYPE.MODIFIED ||
				Item.applicableTestName === Constant.TESTTYPE.TRAFFIC ||
				Item.applicableTestName === Constant.TESTTYPE.ESMA
			);
			if (bIsApplicable && sCurrentTab === ControlIds.VISUAL_ID.VisualTabtab1) {
				oMsg.setVisible(false);
				oVisualCheck.setVisible(true);
			} else if (!bIsApplicable && sCurrentTab === ControlIds.VISUAL_ID.VisualTabtab1) {
				oMsg.setVisible(true);
				oVisualCheck.setVisible(false);
				oTextMartform.setText(this.oi18nModel.getText("visualIns_MessageToastVisualNotAvailable"));
			} else if (!bIsSmartApplicable && sCurrentTab === ControlIds.VISUAL_ID.SmartFormNoId) {
				oMsg.setVisible(true);
				oTextMartform.setText(this.oi18nModel.getText("visualIns_MessageToastSmartformNotAvailable"));
			} else {
				oMsg.setVisible(false);
				oVisualCheck.setVisible(false);
			}
			return bIsApplicable;
		}
	});
});