namespace ADD_VI;

using {managed, } from '@sap/cds/common';

entity AnprCaptures {
    key anprCapturesUUID : String(100);
        plantCode        : String(4) not null;
        laneCode         : String(4);
        captureDate      : DateTime;
        plateNumber      : String(100);
        plateSource      : String(100);
        plateSourceDesc  : String(100);
        plateColor       : String(100);
        plateColorDesc   : String(100);
        plateKind        : String(100);
        plateKindDesc    : String(100);
        plateType        : String(100);
        plateTypeDesc    : String(100);
        platePicture     : LargeBinary;
        cameraNumber     : String(100);
        appVersionNumber : String(100);
        appName          : String(100);
        usedFlag         : String(100) default 'N';
}

@cds.persistence.exists
entity SmsMasters {
    key sequenceNo    : String(3);
    key smsType       : String(30);
    key materialCode  : String(40);
    key materialName  : String(30);
    key siteCode      : String(4);
        siteRegion    : String(3) null;
        emailTemplate : String(255) null;
        arTemplate    : String(255) null;
}

@cds.persistence.exists
entity ShoryTemplateMasters {
    key sequenceNo    : String(3);
    key smsType       : String(30);
    key EMAILTEMPLATE : String(255) null;
        arTemplate    : String(255) null;
}

@cds.persistence.exists
entity AnprPlantLaneConfigs {
    key anprConfigNo         : String(2);
    key plantCode            : String(4);
        plantName            : String(40) null;
        plantItcCode         : String(4) null;
        laneTypeCode         : String(2) null;
        laneTypeDesc         : String(40) null;
        laneCode             : String(3) null;
        laneName             : String(40) null;
        laneItcCode          : String(4) null;
        laneStatus           : String(1) null;
        anprCameraNumber     : String(18) null;
        anprCameraStatus     : String(1) null;
        anprCameraStatusDesc : String(60) null;
}


@cds.persistence.exists
entity PlantMasters {
    key plantCode         : String(4);
    key plantItcCode      : String(4);
        plantName         : String(30) null;
        plantName2        : String(30) null;
        legacySiteNo      : String(20) null;
        plantCustomer     : String(10) null;
        countryCode       : String(3) null;
        countryName       : String(50) null;
        city              : String(25) null;
        cityArabic        : String(40) null;
        regionCode        : String(3) null;
        regionDesc        : String(20) null;
        regionArabic      : String(40) null;
        division          : String(2) null;
        salesOrganization : String(4) null;
        street            : String(60) null;
        streetArabic      : String(60) null;
        pobox             : String(10) null;
        trn               : String(20) null;
}

@cds.persistence.exists
entity LaneMasters {
    key plantCode   : String(4);
    key laneCode    : String(5);
    key laneItcCode : String(4);
        plantName   : String(40) null;
        laneName    : String(40) null;
        laneStatus  : String(1) null;
}

@cds.persistence.exists
entity FuelPriceMasters {
    key materialCode : String(40);
    key materialDesc : String(40);
    key toDate       : String(8);
        fromDate     : String(8) null;
        fuelPrice    : Decimal(17, 2) null;
        currency     : String(5) null;
        average      : Decimal(17, 2) null;
}

@cds.persistence.exists
entity FuelUsageRateMasters {
    key cylinders : String(2);
        fuelRates : String(5);
}

@cds.persistence.exists
entity SalesAreaMasters {
    key salesOrganization   : String(4);
    key distributionChannel : String(2);
    key division            : String(2);
    key documentType        : String(4);
        description         : String(4) null;
}

@cds.persistence.exists
entity PurposeMasters {
    key materialCode : String(40);
    key materialDesc : String(40);
    key laneTypeCode : String(2);
    key laneTypeText : String(60);
    key emiratesCode : String(3);
        emiratesDesc : String(30);
        purposeCode  : String(8);
        purposeDesc  : String(10);
        legService   : String(4);
}

entity RepresentativeMasters {
    key representativeUUID      : UUID;
        emiratesId              : String(100);
        firstName               : String(100);
        lastName                : String(100);
        mobileNo                : String(100);
        emailAddress            : String(100);
        commTypeWhatsapp        : Boolean default false;
        commTypeMail            : Boolean default false;
        commTypeSMS             : Boolean default false;
        idType                  : String(100);
        emiratesFromDate        : DateTime;
        emiratesToDate          : DateTime;
        vehicleOrderInspections : Association to one VehicleOrderInspections;
        AttachmentId            : Association to DAttachment;
}

entity VehicleTypeMasterSyncLog {
    key syncId           : UUID;
        masterType       : String(50);
        syncDate         : DateTime;
        syncMode         : String(10); // MANUAL | SCHEDULED
        status           : String(11); // S=SUCCESS | F=FAILED | P=IN-PROGRESS
        errorMessage     : LargeString;
        syncedBy         : String(50);
        endPointName     : String;
        isActive         : Boolean;
        endPointNameDesc : String(100);
}

entity CustomerMasters : managed {
    key customerUUID          : UUID;
        emiratesId            : String(100);
        firstName             : String(100);
        lastName              : String(100);
        mobileNo              : String(100);
        regionCode            : String(100);
        regionName            : String(100);
        BPGrouping            : String(100);
        extReference          : String(100);
        emailAddress          : String(100);
        companyCode           : String(100);
        salesOrganization     : String(100);
        vatRegistrationNo     : String(100);
        reconciliationAccount : String(100);
        division              : String(100);
        distributionChannel   : String(100);
        paymentTerms          : String(100);
        countryCode           : String(100);
        countryItcCode        : String(100);
        countryExtension      : String(4) null;
        delMark               : Delmark default 0;
        customerNo            : Integer64;
        commTypeWhatsapp      : Boolean default false;
        commTypeMail          : Boolean default false;
        commTypeSMS           : Boolean default false;
        prefLangEng           : Boolean default false;
        prefLangArabic        : Boolean default false;
        customerSyncS4        : String(3) default 'N';
        customerSyncMessage   : LargeString;
        isSynced              : Boolean;
        customerSyncDate      : DateTime;
        customerType          : String(100);
        idType                : String(100);
        searchTerm            : String(100);
        emiratesFromDate      : DateTime;
        emiratesToDate        : DateTime;
        vehicleMasters        : Composition of many VehicleMasters
                                    on vehicleMasters.customerMasters = $self;
}

entity VehicleOrderInspectionChangeVehicleLog : managed {
    key VehicleOrderInspectionChangeVehicleLogUUID : UUID;
        fieldLabelEnglish                          : String(100);
        fieldLabelArabic                           : String(100);
        plateNumber                                : String(100);
        oldValueCode                               : String(100);
        OldTextEnglish                             : String(100);
        OldTextArabic                              : String(100);
        newValueCode                               : String(100);
        newTextEnglish                             : String(100);
        newTextArabic                              : String(100);
        rowType                                    : String(10); //CHANGED/NOTCHANGED
        vehicleOrderInspectionLinesTestChar        : Association to one VehicleOrderInspectionLinesTestChar;
}

entity VehicleMasters : managed {
        customerMasters             : Association to one CustomerMasters;
    key vehicleMastersUUID          : UUID;
        plateNumber                 : String(100) @assert.unique;
        plateSourceCode             : Integer;
        plateSourceEnglish          : String(100);
        plateSourceArabic           : String(100);
        plateColorCode              : Integer;
        plateColorEnglish           : String(100);
        plateColorArabic            : String(100);
        plateKindCode               : Integer;
        plateKindEnglish            : String(100);
        plateKindArabic             : String(100);
        plateTypeCode               : Integer;
        plateTypeEnglish            : String(100);
        plateTypeArabic             : String(100);
        kindCode                    : Integer;
        kindEnglish                 : String(100);
        kindArabic                  : String(100);
        chasisNumber                : String(100);
        engineNumber                : String(100);
        engineNumber1               : String(100);
        engineNumber2               : String(100);
        primaryVin                  : String(100);
        secondaryVin                : String(100);
        countryCode                 : Integer;
        country                     : String(100);
        manfacturerCode             : Integer;
        manfacturerEnglish          : String(100);
        manfacturerArabic           : String(100);
        modelCode                   : Integer;
        modelEnglish                : String(100);
        modelArabic                 : String(100);
        registrationYear            : String(100);
        typeCode                    : Integer;
        typeEnglish                 : String(100);
        typeArabic                  : String(100);
        bodyColorCode               : Integer;
        bodyColorEnglish            : String(100);
        bodyColorArabic             : String(100);
        gearTypeCode                : Integer;
        gearTypeEnglish             : String(100);
        gearTypeArabic              : String(100);
        fuelTypeCode                : Integer;
        fuelTypeEnglish             : String(100);
        fuelTypeArabic              : String(100);
        steeringSideCode            : Integer;
        steeringSideEnglish         : String(100);
        steeringSideArabic          : String(100);
        weightDiscCode              : Integer;
        weightDiscEnglish           : String(100);
        weightDiscArabic            : String(100);
        registrationDate            : DateTime;
        registrationExpiryDate      : DateTime;
        manufacturingYear           : Integer;
        horsePower                  : Integer;
        numberOfAxel                : Integer;
        numberOfWheels              : Integer;
        numberOfCylinders           : Integer;
        numberOfDoors               : Integer;
        numberOfPassengers          : Integer;
        emptyWeight                 : Integer;
        fullWeight                  : Integer;
        mileage                     : String(100);
        cubicCapacity               : String(100);
        customer                    : String(100);
        insuranceName               : String(100);
        insuranceExpiry             : String(100);
        insuranceKindEnglish        : String(100);
        insuranceKindArabic         : String(100);
        insurancePolicyNumber       : String(100);
        mortgageDescription         : String(100);
        mortgageReference           : String(100);
        ownerTcfNumber              : String(100);
        ownerTcfEnglishName         : String(100);
        ownerTcfArabicName          : String(100);
        customCertificateNumber     : String(100);
        customCertificateDate       : DateTime;
        customCertificateCenterCode : String(100);
        customCertificateCenter     : String(100);
        registrationRemarks         : String(100);
        nationalityCode             : String(100);
        nationalityEnglish          : String(100);
        nationalityArabic           : String(100);
        delMark                     : Delmark default 0;
        isModifiedVehicle           : Boolean default false;
        isHandicappedVehicle        : Boolean default false;
        isArmedVehicle              : Boolean default false;
        isAccidentVehicle           : Boolean default false;
        isGCCVehicle                : Boolean default false;
        mileageMtrCode              : Integer null;
        mileageMtrEnglish           : String(100) null;
        mileageMtrArabic            : String(100) null;
        regCarRemarkCode            : Integer null;
        regCarRemarkEnglish         : String(100) null;
        regCarRemarkArabic          : String(100) null;
        damagePlateCode             : String(10) null;
        damagePlateEnglish          : String(100) null;
        damagePlateArabic           : String(100) null;
        lostPlateCode               : String(100) null;
        lostPlateEnglish            : String(100) null;
        lostPlateArabic             : String(100) null;
        searchTerm                  : String(100);
        emiratesExpiryDate          : DateTime;
        isClassicVehicle            : Boolean default false;
        isClassicForShowRoom        : Boolean default false;
        isPeopleForDetermination    : Boolean default false;
}


entity DMSConfig : managed {
    key repoGuid   : UUID;
        repoName   : String(100);
        repoId     : String(100);
        folderName : String(100);
        folderId   : String(100);
}

entity DAttachment : managed {
    key attachmentGuId   : UUID;
        attachmentName   : String(100); // name with Ext.
        orgFileName      : String(100); // User Provided name
        orgFileExtension : String(10); // User Provided Ext.
        docType          : Integer;
        docId            : Integer;
        docGuid          : UUID;
        dmsFileId        : String(100);
        dmsFileName      : String(250); // generated name with uuid
        dmsFileExtension : String(100);
        dmsFolderPath    : String(250);
        dmsRepoId        : String(100);
        remarks          : String(250);
}

entity VehicleLookupConfiguration : managed {
    key vehLookupConfigUUID : UUID;
        makeYear            : Integer;
        manufacture         : Association to one ManufacturerMasters;
        model               : Association to one ModelMasters;
        vehicleKind         : Association to one VehicleKindMasters;
        vehicleType         : Association to one VehicleTypeMasters;
        cylinder            : Integer;
        numberOfDoor        : Integer;
        numberOfPassengers  : Integer;
        weightCode          : String(100);
        emptyWeight         : Integer;
        loadedWeight        : Integer;
        numberOfWheels      : Integer;
        horsePower          : Integer;
        numberOfAxels       : Integer;
}

entity CountryItcMasters : managed {
    key countryItcUUID     : UUID;
        countrItcCode      : Integer;
        countryNameEnglish : String(100);
        countryNameArabic  : String(100);
        delMark            : Delmark default 0;
}


entity CountryMasters : managed {
    key countryUUID        : UUID;
        countrItcCode      : Integer;
        countryNameEnglish : String(100);
        countryNameArabic  : String(100);
        countryCode        : String(3);
        delMark            : Delmark default 0;
}

@cds.persistence.exists
entity RegionMasters {
    key country    : String(3);
        region     : String(3);
        regionName : String(30);
}

entity ManufacturerMasters : managed {
    key makeCode                   : Integer;
        manufacturerEnglish        : String(100);
        manufacturerArabic         : String(100);
        delMark                    : Delmark default 0;
        vehicleLookupConfiguration : Association to one VehicleLookupConfiguration;
}

entity VehPlateKindMasters : managed {
    key vehPlateKindUUID : UUID;
        codeId           : Integer;
        codeDescEnglish  : String(100);
        codeDescArabic   : String(100);
        delMark          : Delmark default 0;
}

entity ModelMasters : managed {
    key modelCode        : Integer;
        modelNameEnglish : String(100);
        modelNameArabic  : String(100);
        delMark          : Delmark default 0;
}

entity VehicleKindMasters : managed {
    key kindCode        : Integer;
        kindNameEnglish : String(100);
        kindNameArabic  : String(100);
        delMark         : Delmark default 0;
}

entity VehicleInspectionCenterMasters : managed {
    key Code               : Integer;
        ArabicDescription  : String(100);
        EnglishDescription : String(100);
        delMark            : Delmark default 0;
}


entity PlateATTMasters : managed {
    key Code               : String(10);
        ArabicDescription  : String(100);
        EnglishDescription : String(100);
        delMark            : Delmark default 0;
}

entity VehicleTypeMasters : managed {
    key typeCode        : Integer;
        typeNameEnglish : String(100);
        typeNameArabic  : String(100);
        delMark         : Delmark default 0;
}

entity BodyColorMasters : managed {
    key bodyColorUUID    : UUID;
        colorCode        : Integer;
        bodyColorEnglish : String(100);
        bodyColorArabic  : String(100);
        delMark          : Delmark default 0;
}

entity GearTypeMasters : managed {
    key gearTypeUUID    : UUID;
        codeId          : Integer;
        codeDescEnglish : String(100);
        codeDescArabic  : String(100);
        delMark         : Delmark default 0;
}

entity FuelTypeMasters : managed {
    key fuelTypeUUID    : UUID;
        codeId          : Integer;
        codeDescEnglish : String(100);
        codeDescArabic  : String(100);
        delMark         : Delmark default 0;
}

entity SteeringSideMasters : managed {
    key SteeringSideUUID : UUID;
        steeringCode     : Integer;
        englishName      : String(100);
        arabicName       : String(100);
        delMark          : Delmark default 0;
}

entity WeightKindMasters : managed {
    key weightKindUUID  : UUID;
        weightKindCode  : Integer;
        codeDescEnglish : String(100);
        codeDescArabic  : String(100);
        delMark         : Delmark default 0;
}

entity RegCarRemarkMasters : managed {
    key regCarRemarkUUID : UUID;
        codeId           : Integer;
        codeDescEnglish  : String(100);
        codeDescArabic   : String(100);
        delMark          : Delmark default 0;
}

entity LostPlateMasters : managed {
    key lostPlateUUID   : UUID;
        codeType        : String(100);
        codeId          : String(100);
        codeDescEnglish : String(100);
        codeDescArabic  : String(100);
        codeStatus      : String(100);
        delMark         : Delmark default 0;
}

entity DamagedPlateMasters : managed {
    key damagedPlateUUID : UUID;
        codeType         : String(100);
        codeId           : String(100);
        codeDescArabic   : String(100);
        codeDescEnglish  : String(100);
        codeStatus       : String(100);
        delMark          : Delmark default 0;
}

entity VehicleOrderInspections : managed {
    key vehicleOrderInspectionUUID            : UUID;
        companyCode                           : String(4);
        salesOrganization                     : String(4);
        salesDivChnl                          : String(2);
        division                              : String(2);
        orderType                             : String(4); //
        orderNo                               : Integer64;
        serviceRequestNo                      : Integer64 @assert.unique;
        orderDate                             : DateTime;
        orderCancellationDate                 : DateTime;
        orderSubTotal                         : Decimal(15, 2) default null;
        discountValue                         : Decimal(15, 2) default null; // Promotional Discount
        orderTotal                            : Decimal(15, 2); // Grand Total
        totalVAT                              : Decimal(15, 2); // VAT Amount
        orderSubTotalAfterDiscount            : Decimal(15, 2); // VAT Amount
        plantCode                             : String(4);
        plantName                             : String(40);
        plantRegionCode                       : String(4);
        plantRegionName                       : String(100);
        customerCode                          : Association to one CustomerMasters;
        customerName                          : String(100); // Need to confirm from the API Response for customer Name
        currencyCode                          : String(3);
        currencyText                          : String(40);
        orderStatus                           : String(15); // O = OPEN, C - CANCELLED, P = PAYMENT, R = REJECTED, CL = CLOSE
        paymentDate                           : DateTime;
        paymentUTRNo                          : String(30); // Changed the length from 100 to 30
        orderReferenceNo                      : String(100); // S4
        orderUTRRefNo                         : String(100);
        orderSyncedS4                         : Boolean default false; // S = SUCCESS, F = FAILED, N - NOT PROCESSED
        orderSyncedMessage                    : LargeString;
        orderSyncDate                         : DateTime;
        requestType                           : String(30);
        s4Indicator                           : String(5) default null;
        s4DeliveryNo                          : String(100) default null;
        retry                                 : String(2) default null;
        error                                 : String(255) default null;
        runningShiftNumber                    : String(10) default null;
        runningShiftName                      : String(40) default null;
        runningBusinessDate                   : DateTime default null;
        shiftFromTime                         : Time default null;
        shiftToTime                           : Time default null;
        // paymentEmailStatus                    : String(3) default null; //S = success , F = failed , N = not processed , N/A
        // paymentSmsStatus                      : String(3) default null; //S = success , F = failed , N = not processed , N/A
        // paymentWhatsappStatus                 : String(3) default null; //S = success , F = failed , N = not processed , N/A
        orderCreatedByCode                    : String(100) default null;
        orderCreatedByUser                    : String(100) default null;
        vehRepInfo                            : Composition of one RepresentativeMasters
                                                    on vehRepInfo.vehicleOrderInspections = $self;
        VehOrdInspDetails                     : Composition of many VehicleOrderInspectionDetails
                                                    on VehOrdInspDetails.vehicleOrderInspections = $self; // need to do Small Case
        vehicleOrderInspectionsPaymentDetails : Composition of many VehicleOrderInspectionsPaymentDetails
                                                    on vehicleOrderInspectionsPaymentDetails.vehicleOrderInspections = $self;
}

entity VehicleOrderInspectionsPaymentDetails : managed {
    key VehicleOrderInspectionsPaymentDetailUUID : UUID;
        paymentDate                              : DateTime; // Current Date
        paymentMode                              : String(100); // Cash
        paidAmount                               : Decimal(19, 2); // Cash
        paymentStatus                            : String(100); // SUCCESSFULL
        paymentAuthCode                          : String(100); // NULL
        paymentRRNNo                             : String(100); // NULL
        vehicleOrderInspections                  : Association to one VehicleOrderInspections;
}

/**
 *
 * PaymentDate
 * PaymentT
 */
entity VehicleOrderInspectionDetails : managed {
    key vehicleOrderInspectionDetailsUUID       : UUID;
        vehicleOrderInspections                 : Association to one VehicleOrderInspections;
        VehicleDetails                          : Association to one VehicleMasters;
        plateNumber                             : String(10); // Need to change the field name to specifc code field.
        plateColor                              : String(40); // Need to change the field name to specifc code field.
        plateSource                             : String(40); // Need to change the field name to specifc code field.
        plateKind                               : String(40); // Need to change the field name to specifc code field.
        plantCode                               : String(4);
        laneCode                                : String(2);
        laneTypeCode                            : String(2);
        inspectionByCode                        : String(100) default null;
        inspectionByUser                        : String(100) default null;
        inspectionStartDateTime                 : DateTime;
        inspectionCompletedDateTime             : DateTime;
        status                                  : String(15);
        lockedBy                                : String(100);
        lockedByDateTime                        : DateTime;
        onHoldDateTime                          : DateTime;
        remarks                                 : String(400); // OnRemarks
        shoryInspNotifSent                      : Boolean default false;
        shoryInspNotifAt                        : DateTime null;
        shoryInspNotifStatus                    : String(1) default 'N'; // e.g. S='SUCCESS', F='FAILED', N='NOT PROCESSED'
        shoryInspNotifError                     : LargeString;
        VehicleOrderInspectionLaneChangeDetails : Composition of many VehicleOrderInspectionLaneChangeDetails
                                                      on VehicleOrderInspectionLaneChangeDetails.vehicleOrderInspections = $self;
        vehOrdInspLines                         : Composition of many VehicleOrderInspectionLines
                                                      on vehOrdInspLines.vehicleOrderInspectionDetails = $self;
}

entity VehicleOrderInspectionLaneChangeDetails : managed {
    key VehicleOrderInspectionLaneChangeDetailsUUID : UUID;
        vehicleOrderInspections                     : Association to one VehicleOrderInspectionDetails;
        fromLaneCode                                : String(4);
        toLaneCode                                  : String(4);
        remarks                                     : String(100);
        laneChangeByUserCode                        : String(100);
        laneChangedByUserName                       : String(100);
        laneChangeDateTime                          : DateTime;
}

entity VehicleOrderInspectionLines : managed {
    key vehicleOrderInspectionLines   : UUID;
        orderLineNo                   : Integer; // 10, 20, 30
        materialCode                  : Integer;
        materialName                  : String(100);
        materialNameArabic            : String(400);
        materialType                  : String(100);
        materialGroup                 : String(100);
        inspectionType                : String(100);
        quantity                      : Decimal(15, 2);
        unitPrice                     : Decimal(15, 2);
        vatCode                       : String(2);
        vat                           : Decimal(15, 2);
        currencyCode                  : String(100);
        currencyText                  : String(100);
        lineTotal                     : Decimal(15, 2);
        totalWithVAT                  : Decimal(15, 2); // need to change the field name to Net Price
        totalWithOutVAT               : Decimal(15, 2); // need to change the field name to Gross Price
        delMark                       : Delmark default 0;
        remarks                       : String(300);
        overallTestStatus             : String(100);
        acknowledgementNo             : Int64;
        attachmentGuId                : Association to one DAttachment;
        childOrderNo                  : Association to one VehicleOrderInspections;
        childSeviceRequestNo          : Integer64 null;
        childMaterialCode             : Integer null;
        childOrderLineNo              : Integer null;
        overallTestStartDate          : DateTime null;
        overallTestEndDate            : DateTime null;
        lineLevelCertLink             : String(500);
        certNotificationSent          : Boolean default false;
        certNotificationChannel       : String(20) default '';
        certNotificationSentAt        : DateTime null;
        certNotificationStatus        : String(1) default 'N'; // e.g. S='SUCCESS', F='FAILED', N='NOT PROCESSED'
        certNotificationError         : LargeString null;
        vatPercent                    : Decimal(15, 2) default null;
        isDeliverySmsStatus           : Boolean default false;
        plantCode                     : String(4) null;
        plateNumber                   : String(10) null;
        LineIndicator                 : String(5) null;
        discountAmount                : Decimal(15, 2) default null;
        inspectionByCode              : String(100) default null;
        inspectionByUser              : String(100) default null;
        retestCount                   : Integer null;
        acknowledgementItcSentDate    : DateTime null;
        acknowledgementItcSentStatus  : String(4) null;
        acknowledgementItcResponse    : LargeString null;
        vehicleOrderInspectionDetails : Association to one VehicleOrderInspectionDetails;
        vehOrdInspLinesTestChars      : Composition of many VehicleOrderInspectionLinesTestChar
                                            on vehOrdInspLinesTestChars.vehicleOrderInspectionLines = $self;
        vehicleOrderInspectionPricing : Composition of many VehicleOrderInspectionPricing
                                            on vehicleOrderInspectionPricing.vehicleOrderInspectionLines = $self;
        vehicleOrderCoupans           : Composition of many VehicleOrderInspectionCoupans
                                            on vehicleOrderCoupans.vehicleOrderInspectionLines = $self;
}

entity VehicleOrderInspectionPricing {
    key id                          : UUID;
        vehicleOrderInspectionLines : Association to one VehicleOrderInspectionLines;
        condType                    : String(4);
        condValue                   : Decimal(15, 2);
};

entity VehicleOrderInspectionCoupans {
    key id                          : UUID;
        vehicleOrderInspectionLines : Association to one VehicleOrderInspectionLines;
        couponNumber                : String(15) null;
        condType                    : String(4) null;
        condValue                   : Decimal(15, 2) null;
        condCurrency                : String(3) null;
};

entity VehicleOrderInspectionLinesTestChar : managed {
    key VehicleOrderInspectionLinesTestCharUUID : UUID;
        applicableTestName                      : String(100);
        testStatus                              : String(100); // OPEN, INPROGRESS, PASS, FAILED
        testComments                            : String(300);
        testInspectedBy                         : String(100);
        testInspectedByCode                     : String(100) null;
        testInspectionStartDate                 : DateTime;
        testInspectionEndDate                   : DateTime;
        processWorkflowInstanceId               : String(100) null;
        currTaskInstanceId                      : String(100) null;
        pendingWithUser                         : String(100) null;
        vehicleOrderInspectionLines             : Association to one VehicleOrderInspectionLines;
        testResultsESMAS                        : Composition of many TestResultsESMA
                                                      on testResultsESMAS.vehicleOrderInspectionLinesTestChar = $self;
        testResultsTraffics                     : Composition of many TestResultsTraffic
                                                      on testResultsTraffics.vehicleOrderInspectionLinesTestChar = $self;
        testResTrafficAttachs                   : Composition of many TestResTrafficAttachs
                                                      on testResTrafficAttachs.vehicleOrderInspectionLinesTestChar = $self;
        testResComps                            : Composition of many TestResultsComprehensive
                                                      on testResComps.vehicleOrderInspectionLinesTestChar = $self;
        vehicleOrderInspectionChangeVehicleLogs : Composition of many VehicleOrderInspectionChangeVehicleLog
                                                      on vehicleOrderInspectionChangeVehicleLogs.vehicleOrderInspectionLinesTestChar = $self;
        testResultsPermits                      : Composition of many TestResultsPermit
                                                      on testResultsPermits.vehicleOrderInspectionLinesTestChar = $self;
        testRessVisuals                         : Composition of many TestResultsVisual
                                                      on testRessVisuals.vehicleOrderInspectionLinesTestChar = $self;
        testResMahaInDtls                       : Composition of many testResMahaInDtl
                                                      on testResMahaInDtls.vehicleOrderInspectionLinesTestChar = $self;
        testResMahaOutDtls                      : Composition of many testResMahaOutDtl
                                                      on testResMahaOutDtls.vehicleOrderInspectionLinesTestChar = $self;
        testResModHdr                           : Composition of many TestResultsModifiedHeader
                                                      on testResModHdr.vehicleOrderInspectionLinesTestChar = $self;
        testResApprovalHistories                : Association to many InspectionLinesApprovalHistory
                                                      on testResApprovalHistories.refDocumentID = $self.VehicleOrderInspectionLinesTestCharUUID;
}

entity InspectionLinesApprovalHistory {
    key ID                      : UUID; // Unique ID
        refDocumentID           : UUID; // Reference to main document (e.g., PO or Leave)
        performedByUserId       : String(100); // Current approver user ID
        performedByMailAddress  : String(100); // Current approver email
        performedByFullName     : String(100); // Current approver full name
        action                  : String(20); // INITIATOR // APPROVED / REJECTED / PENDING
        comments                : String(255); // Remarks by approver
        actionDate              : Timestamp; // Date and time of action
        nextApproverUserId      : String(100); // Next approver user ID
        nextApproverMailAddress : String(100); // Next approver email
        nextApproverFullName    : String(100); // Next approver full name
        nextApproverRole        : String(50); // Role or designation of next approver
}


entity testResMahaInDtl : managed {
    key testResMahaFileDtlUUID              : UUID;
        vehicleOrderInspectionLinesTestChar : Association to one VehicleOrderInspectionLinesTestChar;
        startDate                           : DateTime;
        completedDate                       : DateTime;
        attachmentData                      : LargeString null;
        attachmentName                      : String(100) null;
        inUse                               : Boolean default false;
        isError                             : Boolean default false;
        errorDesc                           : String(1000);
}

entity testResMahaOutDtl : managed {
    key testResMahaOutFileDtlUUID           : UUID;
        vehicleOrderInspectionLinesTestChar : Association to one VehicleOrderInspectionLinesTestChar;
        startDate                           : DateTime;
        completedDate                       : DateTime;
        attachmentData                      : LargeString null;
        attachmentName                      : String(100) null;
        testMahaOutResult                   : Composition of many testMahaOutResult
                                                  on testMahaOutResult.testResMahaOutDtl = $self;
}

entity testMahaOutResult : managed {
    key testResultMahaOutUUID : UUID;
        testResMahaOutDtl     : Association to one testResMahaOutDtl;
        mahaLabelEnglish      : String(1000);
        mahaLabelArabic       : String(1000);
        mahaCodeKey           : String(100);
        mahaCodeValue         : String(100);
}

entity Shifts {
    key UUID                : UUID;
        siteNumber          : String(4);
        businessDate        : Date;
        shiftDetail         : String(10);
        eventType           : String(30);
        shiftFromDate       : Date;
        shiftFromTime       : Time;
        shiftToDate         : Date;
        shiftToTime         : Time;
        runningShiftNumber  : String(10);
        runningBusinessDate : Date;
}

entity MileageMtrStatusMasters : managed {
    key mileageMtrStatuUUID : UUID;
        codeId              : Integer;
        codeDescEnglish     : String(100);
        codeDescArabic      : String(100);
        delMark             : Delmark default 0;
}

entity VehPlateSourceMasters : managed {
    key vehPlateSourceUUID : UUID;
        codeId             : Integer;
        codeDescEnglish    : String(100);
        codeDescArabic     : String(100);
        delMark            : Delmark default 0;
}

entity VehPlateColorMasters : managed {
    key vehPlateColorUUID : UUID;
        codeId            : Integer;
        codeDescEnglish   : String(100);
        codeDescArabic    : String(100);
        delMark           : Delmark default 0;
}

type setInspectionResultRequest {
    request : {
        SystemCode                  : Integer;
        ChassisNo                   : String(50);
        OldChassisNo                : String(50);
        ReferenceNo                 : Integer;
        IsPassed                    : Boolean;
        InspectionDate              : DateTime;
        InspectionCenterCode        : Integer;
        VehicleMakeCode             : Integer;
        VehicleModelCode            : Integer;
        VehicleKindCode             : Integer;
        VehicleTypeCode             : Integer;
        VehicleColorCode            : Integer;
        VehicleNationalityCode      : Integer;
        EngineNo                    : String(50);
        VehicleMakingYear           : Integer;
        Cylinders                   : Integer;
        Axles                       : Integer;
        Doors                       : Integer;
        Chairs                      : Integer;
        HorsePower                  : Integer;
        WeightFull                  : Integer;
        WeightEmpty                 : Integer;
        Wheels                      : Integer;
        GearCode                    : Integer;
        WeightKindCode              : Integer;
        SteeringCode                : Integer;
        FuelCode                    : Integer;
        PurposeCode                 : Integer;
        IsClassicVehicle            : Boolean;
        IsHandicappedVehicle        : Boolean;
        IsModifiedVehicle           : Boolean;
        IsClassicForShowRoom        : Boolean;
        InspectionFees              : Integer;
        OdometerCurrentRead         : Integer;
        OdometerPreviousRead        : Integer;
        IsArmedVehicle              : Boolean;
        LaneNo                      : Integer;
        InspectorEID                : Integer;
        RegistrationCardRemarksCode : Integer;
    };
}

type setInspectionResult {
    setInspectionResult : {
        setInspectionResultRequest : setInspectionResultRequest;
    };
}

type PlateInfo {
    PlateNo         : Integer;
    PlateOrgNo      : Integer;
    PlateColorCode  : Integer;
    PlateKindCode   : Integer;
    PlateTypeCode   : Integer;
    PlateSourceCode : Integer;
}


type VehicleDetailsRequest {
    request : {
        SystemCode : Int64;
        PlateInfo  : PlateInfo;
        ChassisNo  : String;
        TrafficNo  : Int64;
    };
}

type VehicleDetails {
    getVehicleDetails : {
        Header                   : {
            sourceApp     : String;
            transactionId : String;
        };
        getVehicleDetailsRequest : VehicleDetailsRequest;
    };
}

entity TestResultsESMA : managed {
    key TestResultsESMAUUID                 : UUID;
        vehicleOrderInspectionLinesTestChar : Association to one VehicleOrderInspectionLinesTestChar;
        testMainTypeNo                      : Int64;
        testFlag                            : String(100);
        testMainTypeTextEnglish             : String(100);
        testMainTypeTextArabic              : String(100);
}

entity TestResultsPermit : managed {
    key testResultsPermitUID                : UUID;
        vehicleOrderInspectionLinesTestChar : Association to one VehicleOrderInspectionLinesTestChar;
        materialCode                        : Integer;
        materialLabelEng                    : String(100);
        materialLabelArabic                 : String(100);
        serviceTypeValue                    : Integer;
        serviceTypeCode                     : Integer;
        serviceTypeTextEng                  : String(100);
        serviceTypeTextArabic               : String(100);
        companyType                         : String(100);
        companyName                         : String(100);
        serviceComments                     : String(100);
        representativeType                  : String(100);
        representativeId                    : String(100);
        idExpiryDate                        : DateTime;
        idName                              : String(100);
        idImageNo                           : Association to DAttachment;
        certificateType                     : String(30);
        certificateNo                       : String(30);
        certificateDate                     : DateTime;
        certificateRef                      : String(30);
        Remarks                             : String(100);
        existingServiceCode                 : Integer;
        existingServiceTextEng              : String(100);
}

entity PermitCombinationMasters {
    key permitCombinationMasterUUID : UUID;
        materialCode                : Integer;
        materialConstantDesc        : String(100);
        materialName                : String(100);
        isActive                    : Boolean;
}

entity TestResultsTraffic : managed {
    key TestResultsTrafficUUID              : UUID;
        testMainTypeSrNo                    : Integer null;
        testMainTypeNo                      : Int64;
        testMainTypeTextEnglish             : String(100);
        testMainTypeTextArabic              : String(100);
        testSubTypeTextEnglish              : String(100);
        testSubTypeTextArabic               : String(100);
        controlTypeValueLabel1Flag          : Boolean default false;
        controlTypeValueLabel1Text          : String(100) default null;
        controlTypeValueLabel2Flag          : Boolean default false;
        controlTypeValueLabel2Text          : String(100) default null;
        controlTypeValueLabel3Flag          : Boolean default false;
        controlTypeValueLabel3Text          : String(100) default null;
        controlTypeValueLabel4Flag          : Boolean default false;
        controlTypeValueLabel4Text          : String(100) default null;
        vehicleOrderInspectionLinesTestChar : Association to one VehicleOrderInspectionLinesTestChar;
}

entity TestResTrafficAttachs : managed {
    key testResultsAttachsUUID              : UUID;
        testMainTypeSrNo                    : Integer null;
        testMainTypeNo                      : Int64;
        testMainTypeTextEnglish             : String(100);
        testMainTypeTextArabic              : String(100);
        uploadedDate                        : Date;
        uploadedTime                        : Time;
        DisplayName                         : String(100);
        attachmentGuId                      : Association to one DAttachment;
        vehicleOrderInspectionLinesTestChar : Association to one VehicleOrderInspectionLinesTestChar;
}

entity TestResultsComprehensive : managed {
    key TestResultsComprehensiveUUID        : UUID;
        testMainTypeSrNo                    : Integer null;
        testMainTypeNo                      : String(3);
        testMainTypeTextEnglish             : String(100);
        testMainTypeTextArabic              : String(100);
        testSubTypeTextEnglish              : String(100);
        testSubTypeTextArabic               : String(100);
        testSubTypeNo                       : String(100);
        examinationMethodEnglish            : String(100);
        examinationMethodArabic             : String(100);
        controlTypeValueLabel1              : String(100);
        controlTypeValueLabel2              : String(100);
        controlTypeValueLabel1Flag          : Boolean default false;
        controlTypeValueLabel2Flag          : Boolean default false;
        conditionalMappingMasterCode        : String(200);
        compResSubTypesText                 : String(200);
        vehicleOrderInspectionLinesTestChar : Association to one VehicleOrderInspectionLinesTestChar;
        compResSubTypes                     : Composition of many ComprehensiveResultSubType
                                                  on compResSubTypes.testResultsComprehensive = $self;
}


entity ComprehensiveResultSubType : managed {
    key TestResultsComprehensiveUUID : UUID;
        testTypeKey                  : String(100);
        testTypeTextEnglish          : String(100);
        testTypeTextArabic           : String(100);
        testResultsComprehensive     : Association to one TestResultsComprehensive;
}

@cds.persistence.exists
entity RefundReasonMasters {
    key sequenceNo        : String(3);
    key reasonCode        : String(2);
        reasonTextEnglish : String(100);
        reasonTextArabic  : String(100);
}


@cds.persistence.exists
entity TestTypeMasters {
    key testTypeId                   : String(3);
    key testTextNo                   : String(100);
        testText                     : String(100) null;
        legacyMainTypeNo             : String(6) null;
        testMainTypeNo               : String(3) null;
        testMainTypeTextEnglish      : String(100) null;
        testMainTypeTextArabic       : String(100) null;
        legacySubTypeNo              : String(6) null;
        testSubTypeNo                : String(100) null;
        testSubTypeTextEnglish       : String(100) null;
        testSubTypeTextArabic        : String(100) null;
        examinationMethodEnglish     : String(100) null;
        examinationMethodArabic      : String(100) null;
        controlType1                 : String(100) null;
        controlType1Text             : String(100) null;
        controlType2                 : String(100) null;
        controlType2Text             : String(100) null;
        controlType3                 : String(100) null;
        controlType3Text             : String(100) null;
        controlType4                 : String(100) null;
        controlType4Text             : String(100) null;
        controlType5                 : String(100) null;
        controlType5Text             : String(100) null;
        controlType6                 : String(100) null;
        controlType6Text             : String(100) null;
        controlTypeValueLabel1       : String(100) null;
        controlTypeValueLabel2       : String(100) null;
        controlTypeValueLabel3       : String(100) null;
        controlTypeValueLabel4       : String(100) null;
        controlTypeValueLabel5       : String(100) null;
        controlTypeValueLabel6       : String(100) null;
        conditionalMappingMasterCode : String(100) null;
        conditionalMappingMasterName : String(100) null;
}

entity TestTypeCombinationMaster {
    key testTypeCombinationUUID : UUID;
        testTypeKey             : String(100);
        testTypeTextEnglish     : String(100);
        testTypeTextArabic      : String(100);
        delMark                 : Delmark default 0;
        testTypeNo              : String(100);
}


entity TestResultsVisual : managed {
    key testResultsVisualUUID               : UUID;
        vehicleOrderInspectionLinesTestChar : Association to one VehicleOrderInspectionLinesTestChar;
        testMaterialCode                    : Integer;
        testMainTypeNo                      : String(3);
        testMainTypeTextEnglish             : String(100);
        testMainTypeTextArabic              : String(100);
        testSubTypeNo                       : String(100);
        testSubTypeTextEnglish              : String(100);
        testSubTypeTextArabic               : String(100);
        examinationMethodEnglish            : String(100);
        examinationMethodArabic             : String(100);
        Remarks                             : String(300); // Comments
        issueType                           : String(10); // Minor / Major
        testResVsSDtl                       : Composition of many TestResultsVisualDetail
                                                  on testResVsSDtl.testResultsVisualDetail = $self;

}

entity TestResultsVisualAttach : managed {
    key testResultsVisualAttachID : UUID;
        testResultsVisualAttach   : Association to one TestResultsVisualDetail;
        attachmentGuId            : Association to one DAttachment;
}

entity TestResultsVisualDetail : managed {
    key testResultsVisualDtlUUID : UUID;
        testResultsVisualDetail  : Association to one TestResultsVisual;
        Remarks                  : String(300); // Comments
        issueType                : String(10); // Minor / Major
        testTypeKey              : String(100);
        testTypeTextEnglish      : String(100);
        testTypeTextArabic       : String(100);
        testResvslAtt            : Composition of many TestResultsVisualAttach
                                       on testResvslAtt.testResultsVisualAttach = $self;


}

entity MapReportTmpltName {
    TemplateNameUUID   : UUID;
    applicableTestName : String;
    xdpName            : String;
    delMark            : Delmark default 0;
}

entity OverallTestStatusMaster {
    key overallTestUUID        : UUID;
        trafficTestStatus      : String(100);
        compTestStatus         : String(100);
        esmaTestStatus         : String(100);
        visualTestStatus       : String(100);
        mahaTestStatus         : String(100);
        permitResultStatus     : String(100);
        modifiedResultStatus   : String(100);
        overallFinalTestStatus : String(100);
}

entity TestResultsModifiedHeader : managed {
    key TestResultsModifiedHeaderUUID       : UUID;
        horsepowerCurrent                   : Integer null;
        horsepowerFactory                   : Integer null;
        horsepowerPercentage                : Integer null;
        horsepowerCallStage                 : Integer null;
        horsepowerFinalStage                : Integer null;
        horsepowerAttachment                : Association to one DAttachment;
        testResModDtl                       : Composition of many TestResultsModifiedDetail
                                                  on testResModDtl.testResultsModifiedHeader = $self;
        vehicleOrderInspectionLinesTestChar : Association to one VehicleOrderInspectionLinesTestChar;
}

entity TestResultsModifiedDetail : managed {
    key TestResultsModifiedUUID    : UUID;
        testMainTypeSrNo           : Integer;
        testMainTypeNo             : String(100);
        testMainTypeTextEnglish    : String(100);
        testMainTypeTextArabic     : String(100);
        testSubTypeNo              : String(100);
        testSubTypeTextEnglish     : String(100);
        testSubTypeTextArabic      : String(100);
        childSubTypeNo             : String(100);
        childSubTypeTextEnglish    : String(100);
        childSubTypeTextArabic     : String(100);
        examinationMethodEnglish   : String(100);
        examinationMethodArabic    : String(100);
        controlTypeValueLabel1Flag : Boolean default false;
        controlTypeValueLabel2Flag : Boolean default false;
        modifyStageCode            : String(100);
        modifyStageDesc            : String(100);
        modifiedItcSerialNo        : String(20) null;
        modifiedItcSentDate        : DateTime null;
        modifiedItcSentStatus      : String(4) null;
        modifiedItcSentResponse    : LargeString null;
        testResModifiedAttachs     : Composition of many TestResModifiedAttachs
                                         on testResModifiedAttachs.testResultsModifiedDetail = $self;
        TestResModCom              : Composition of many TestResModifiedComm
                                         on TestResModCom.testResultsModifiedDetail = $self;
        testResultsModifiedHeader  : Association to one TestResultsModifiedHeader;
        modResTypes                : Composition of many ModifiedResultSubType
                                         on modResTypes.testResultsModified = $self;
}

entity ModifiedResultSubType {
    key TestResultsModifiedUUID : UUID;
        testTypeKey             : String(100);
        testTypeTextEnglish     : String(100);
        testTypeTextArabic      : String(100);
        testResultsModified     : Association to one TestResultsModifiedDetail;
}


entity TestResModifiedAttachs {
    key testResModAttId           : UUID;
        testMainTypeSrNo          : Integer;
        testMainTypeNo            : String(100);
        testSubTypeNo             : String(100);
        uploadedDate              : Date;
        uploadedTime              : Time;
        DisplayName               : String(100);
        AttachmentId              : Association to DAttachment;
        testResultsModifiedDetail : Association to one TestResultsModifiedDetail;
}

entity TestResModifiedComm {
    key testResModCommId          : UUID;
        testMainTypeSrNo          : Integer;
        testMainTypeNo            : String(100);
        Comments                  : String(400);
        testResultsModifiedDetail : Association to one TestResultsModifiedDetail;
}

type Delmark                      : Int16 enum {
    Yes = 1;
    No = 0;
}

type OptionsYesNo                 : String enum {
    Yes = 'Y';
    No = 'N';
}

entity MahaConfigurations : managed {
    key serviceDetailUUID : UUID;
        mahaFieldCode     : String(100);
        mahaCodeDesc      : String(100);
        sapCodeDesc       : String(100);
        fieldSourceTable  : String(100);
        fieldSourceName   : String(100);
        fieldSourceValue  : String(100);
        sequenceNumber    : Int64;
        mahaType          : String(10);

}

type header {
    testMainTypeNo          : Int64;
    testMainTypeTextEnglish : String;
    SubCategory             : SubCategory;

}

type SubCategory {
    testSubTypeTextEnglish : String;
    testSubTypeTextArabic  : String;
    controlTypeValueLabel1 : String;
    controlTypeValueLabel2 : String;
    controlTypeValueLabel3 : String;
    controlTypeValueLabel4 : String
}

entity AnprRecaptureMaster : managed {
    key AnprRecapture      : UUID;
        siteId             : Integer;
        sectionId          : Integer;
        capturedOn         : DateTime;
        plateNumber        : String(100);
        plateSourceCode    : Integer;
        plateSourceEnglish : String(100);
        plateColorCode     : Integer;
        plateColorEnglish  : String(100);
        plateKindCode      : Integer;
        plateKindEnglish   : String(100);
        plateTypeCode      : Integer;
        plateTypeEnglish   : String(100);
        cameraNumber       : String(100);
        appVersionNumber   : String(100);
        appName            : String(100);
        vendorId           : String(100);
        hashKey            : String(100);
        plateImage         : LargeBinary;
}


entity EmployeeMaster : managed {
    key empCode           : Integer64;
        plantCode         : String(4);
        plantName         : String(30);
        changePlantCode   : String(4);
        changePlantName   : String(30);
        empNameEnglish    : String(40);
        empNameArabic     : String(163);
        empRole           : String(25);
        empStatus         : String(1);
        empEmailAddress   : String(241);
        empMobileNo       : String(30);
        empEmiratesId     : String(30);
        validFromDate     : DateTime;
        validToDate       : DateTime;
        equipmentType     : String(100);
        mahaPassword      : String(100);
        reminderSmsSent   : Boolean default false;
        reminderEmailSent : Boolean default false;
        empShift          : Association to ShiftMaster;
}

entity ShiftMaster : managed {
    key shiftId     : UUID;
        description : String(40);
        startTime   : String(10);
        endTime     : String(10);
        status      : Delmark default 0;
}

entity ReEmbossNum {
    key reEmbossNumGuid : UUID;
    key plantCode       : String(4);
        fromNumber      : Int64;
        toNumber        : Int64;
        currNumber      : Int64;
}

entity PaymentDocs : managed {
    key paymentUUID                : UUID;
        orderNumber                : String(10); //2000000000 - 2999999999
        paymentDocNum              : String(10); //5000000000 - 5999999999
        year                       : Integer;
        orderUUID                  : Association to VehicleOrderInspections;
        currency                   : String(5);
        netValue                   : Decimal(15, 2);
        taxValue                   : Decimal(15, 2);
        totalValue                 : Decimal(15, 2);
        paymentDocType             : String(3);
        paymentNotificationSent    : Boolean default false;
        paymentNotificationChannel : String(20) null;
        paymentNotificationSentAt  : DateTime null;
        paymentNotificationStatus  : String(1) default 'N'; // e.g. S='SUCCESS', F='FAILED', N='NOT PROCESSED'
        paymentNotificationError   : LargeString null;
        items                      : Composition of many PaymentItemSet
                                         on items.paymentUUID = $self;
}

entity PaymentItemSet : managed {
    key id               : UUID;
    key paymentItem      : String(6);
        paymentUUID      : Association to PaymentDocs;
        orderNumber      : String(10);
        paymentDocNum    : String(10);
        mop              : String(60);
        mopCode          : String(4);
        status           : String(1);
        cardCounter      : String(2);
        advFlag          : String(1);
        txnType          : String(3);
        actionCode       : String(2);
        responseMsg      : String(42);
        respCode         : String(3);
        acnocInvoice     : String(30);
        posInvoice       : String(6);
        amount           : Decimal(15, 2);
        cardholderName   : String(26);
        cardNumber       : String(19);
        cardName         : String(15);
        entryMode        : String(15);
        signRequired     : String(1);
        approvalCode     : String(100);
        txnDateTime      : String(14);
        emvLabel         : String(16);
        emvAid           : String(32);
        emvTsr           : String(10);
        emvTsi           : String(4);
        emvAc            : String(16);
        totalDebitCount  : String(6);
        totalCreditCount : String(6);
        totalDebitAmt    : String(6);
        totalCreditAmt   : String(6);
        rrn              : String(12);
        tid              : String(8);
        batch            : String(6);
        mid              : String(15);
        cardSeqNum       : String(2);
        voidFlag         : String(1);
        chCurr           : String(3);
        chCurrExp        : String(1);
        chAmt            : String(13);
        chExchRate       : String(8);
        chMarkup         : String(5);
        par              : String(29);
        mun              : String(32);
        vasRrn           : String(12);
        vasInsdis        : String(1);
        vasQr            : String(1);
        vasVouch         : String(1);
        clmMessage       : String(1000);
}

type overAllStatus {
    applicableTestName : String;
    testStatus         : String
}

entity ErrorLogs : managed {
    key errorId       : UUID;
        documentRefNo : String(500); //request  identification number
        errorResponse : LargeString;
        reqPayload    : LargeString;
        module        : String(500);
        endPoint      : String(500);
        methodCalled  : String(500);
}


type VehOrdInspLinesTestCharsType : {
    testInspectedBy         : String;
    testInspectionStartDate : Timestamp;
    testInspectionEndDate   : Timestamp;
    testStatus              : String;
    applicableTestName      : String;
}

type VehOrdInspLinesType          : {
    orderLineNo              : String;
    materialCode             : Integer;
    materialName             : String;
    materialNameArabic       : String;
    materialType             : String;
    materialGroup            : String;
    inspectionType           : String;
    quantity                 : Integer;
    unitPrice                : Decimal(15, 2);
    vat                      : Decimal(15, 2);
    currencyCode             : String;
    currencyText             : String;
    lineTotal                : Decimal(15, 2);
    totalWithVAT             : Decimal(15, 2);
    totalWithOutVAT          : Decimal(15, 2);
    delMark                  : Integer;
    vehOrdInspLinesTestChars : array of VehOrdInspLinesTestCharsType;
}

type VehOrdInspDetailsType        : {
    vehicleOrderInspectionDetailsUUID : String;
    VehicleDetails_vehicleMastersUUID : UUID;
    plateNumber                       : String;
    laneCode                          : String;
    inspectionByUser                  : String;
    inspectionStartDateTime           : Timestamp;
    inspectionCompletedDateTime       : Timestamp;
    status                            : String;
    lockedBy                          : String;
    lockedByDateTime                  : Timestamp;
    onHoldDateTime                    : Timestamp;
    vehOrdInspLines                   : array of VehOrdInspLinesType;
}

entity plantAuthorizationMaster {
    key id            : UUID;
        Type          : String(100);
        FromPlantCode : String(4);
        ToPlantCode   : String(4);
}

entity smsNotificationHistory {
    key id               : UUID;
        scenarioType     : String(50);
        smsContent       : LargeString;
        messageSentDate  : DateTime;
        receipientMobile : String(100);
        isDelivered      : Boolean default false;
        failureReason    : LargeString;
}

entity emailNotificationHistory {
    key id                 : UUID;
        scenarioType       : String(50);
        emailContent       : LargeString;
        messageSentDate    : DateTime;
        receipientEmail    : String(100);
        isDelivered        : Boolean default false;
        isAttachmentExists : Boolean default false;
        failureReason      : LargeString;
}

@cds.persistence.exists
entity MaterialPricingMasters {
    key conditionType       : String(4);
    key materialCode        : String(40);
    key condRecordNo        : String(10);
        plantCode           : String(4) null;
        listType            : String(2) null;
        salesOrganization   : String(4) null;
        distributionChannel : String(2) null;
        region              : String(2) null;
        validTo             : String(10) null;
        validFrom           : String(10) null;
        accessSequence      : String(4) null;
        accessNo            : String(3) null;
        tableNumber         : String(4) null;
        condAmount          : Decimal(17, 2) null;
        condCurrency        : String(5) null;
        vatPercent          : Decimal(17, 2) null;
        conditionCurrency   : String(5) null;
}

@cds.persistence.exists
entity MaterialPricingComb1 {
    key conditionType       : String(4);
    key materialCode        : String(40);
    key condRecordNo        : String(10);
    key plantCode           : String(4);
    key listType            : String(2);
    key salesOrganization   : String(4);
    key distributionChannel : String(2);
    key validTo             : String(10);
    key validFrom           : String(10);
        accessSequence      : String(4) null;
        accessNo            : String(3) null;
        tableNumber         : String(4) null;
        condAmount          : Decimal(17, 2) null;
        condCurrency        : String(5) null;
        vatPercent          : Decimal(17, 2) null;
        conditionCurrency   : String(5) null;
        taxCode             : String(2) null;
}

@cds.persistence.exists
entity MaterialPricingComb2 {
    key conditionType       : String(4);
    key materialCode        : String(40);
    key condRecordNo        : String(10);
    key salesOrganization   : String(4);
    key distributionChannel : String(2);
    key listType            : String(2);
    key validTo             : String(10);
    key validFrom           : String(10);
        accessSequence      : String(4) null;
        accessNo            : String(3) null;
        tableNumber         : String(4) null;
        condAmount          : Decimal(17, 2) null;
        condCurrency        : String(5) null;
        vatPercent          : Decimal(17, 2) null;
        conditionCurrency   : String(5) null;
        taxCode             : String(2) null;
}

@cds.persistence.exists
entity MaterialPricingComb3 {
    key conditionType       : String(4);
    key materialCode        : String(40);
    key condRecordNo        : String(10);
    key salesOrganization   : String(4);
    key distributionChannel : String(2);
    key region              : String(2);
    key listType            : String(2);
    key validTo             : String(10);
    key validFrom           : String(10);
        accessSequence      : String(4) null;
        accessNo            : String(3) null;
        tableNumber         : String(4) null;
        condAmount          : Decimal(17, 2) null;
        conditionCurrency   : String(5) null;
        vatPercent          : Decimal(9, 2) null;
        condCurrency        : String(5) null;
        taxCode             : String(2) null;
}

@cds.persistence.exists
entity MaterialPricingComb4 {
    key conditionType       : String(4);
    key materialCode        : String(40);
    key condRecordNo        : String(10);
    key salesOrganization   : String(4);
    key distributionChannel : String(2);
    key plantCode           : String(3);
    key fromTime            : String(8);
    key toTime              : String(8);
    key listType            : String(2);
    key validTo             : String(10);
    key validFrom           : String(10);
        accessSequence      : String(4) null;
        accessNo            : String(3) null;
        tableNumber         : String(4) null;
        condAmount          : Decimal(17, 2) null;
        conditionCurrency   : String(5) null;
        vatPercent          : Decimal(17, 2) null;
        condCurrency        : String(5) null;
        taxCode             : String(2) null;
}

@cds.persistence.exists
entity MaterialPricingComb5 {
    key conditionType       : String(4);
    key materialCode        : String(40);
    key condRecordNo        : String(10);
    key salesOrganization   : String(4);
    key distributionChannel : String(2);
    key region              : String(3);
    key validTo             : String(10);
    key validFrom           : String(10);
        accessSequence      : String(4) null;
        accessNo            : String(3) null;
        tableNumber         : String(4) null;
        condAmount          : Decimal(17, 2) null;
        conditionCurrency   : String(5) null;
        vatPercent          : Decimal(9, 2) null;
        condCurrency        : String(5) null;
        taxCode             : String(2) null;
}

@cds.persistence.exists
entity MaterialPricingComb6 {
    key conditionType       : String(4);
    key materialCode        : String(40);
    key condRecordNo        : String(10);
    key salesOrganization   : String(4);
    key distributionChannel : String(2);
    key validTo             : String(10);
    key validFrom           : String(10);
        accessSequence      : String(4) null;
        accessNo            : String(3) null;
        tableNumber         : String(4) null;
        condAmount          : Decimal(17, 2) null;
        conditionCurrency   : String(5) null;
        vatPercent          : Decimal(17, 2) null;
        condCurrency        : String(5) null;
        taxCode             : String(2) null;
}

@cds.persistence.exists
entity MaterialPricingComb7 {
    key conditionType       : String(4);
    key materialCode        : String(40);
    key condRecordNo        : String(10);
    key salesOrganization   : String(4);
    key distributionChannel : String(2);
    key plantRegion         : String(3);
    key materialGroup       : String(9);
    key validTo             : String(10);
    key validFrom           : String(10);
        accessSequence      : String(4) null;
        accessNo            : String(3) null;
        tableNumber         : String(4) null;
        condAmount          : Decimal(17, 2) null;
        conditionCurrency   : String(5) null;
        condCurrency        : String(5) null;
}

@cds.persistence.exists
entity MaterialPricingComb8 {
    key conditionType       : String(4);
    key materialCode        : String(40);
    key condRecordNo        : String(10);
    key salesOrganization   : String(4);
    key distributionChannel : String(2);
    key plantRegion         : String(3);
    key listType            : String(2);
    key materialGroup       : String(9);
    key validTo             : String(10);
    key validFrom           : String(10);
        accessSequence      : String(4) null;
        accessNo            : String(3) null;
        tableNumber         : String(4) null;
        condAmount          : Decimal(17, 2) null;
        conditionCurrency   : String(5) null;
        condCurrency        : String(5) null;
}

@cds.persistence.exists
entity MaterialPricingComb9 {
    key conditionType       : String(4);
    key materialCode        : String(40);
    key condRecordNo        : String(10);
    key salesOrganization   : String(4);
    key distributionChannel : String(2);
    key plantRegion         : String(3);
    key plateSource         : String(40);
    key validTo             : String(10);
    key validFrom           : String(10);
        accessSequence      : String(4) null;
        accessNo            : String(3) null;
        tableNumber         : String(4) null;
        condAmount          : Decimal(17, 2) null;
        conditionCurrency   : String(5) null;
        condCurrency        : String(5) null;
}


@cds.persistence.exists
entity MaterialPricingComb10 {
    key conditionType       : String(4);
    key materialCode        : String(40);
    key condRecordNo        : String(10);
    key salesOrganization   : String(4);
    key distributionChannel : String(2);
    key plateSource         : String(40);
    key validTo             : String(10);
    key validFrom           : String(10);
        accessSequence      : String(4) null;
        accessNo            : String(3) null;
        tableNumber         : String(4) null;
        condAmount          : Decimal(17, 2) null;
        conditionCurrency   : String(5) null;
        condCurrency        : String(5) null;
}

@cds.persistence.exists
entity MaterialPricingComb11 {
    key conditionType       : String(4);
    key materialCode        : String(40);
    key condRecordNo        : String(10);
    key salesOrganization   : String(4);
    key distributionChannel : String(2);
    key plateSource         : String(40);
    key vehicleYear         : String(4);
    key validTo             : String(10);
    key validFrom           : String(10);
        accessSequence      : String(4) null;
        accessNo            : String(3) null;
        tableNumber         : String(4) null;
        condAmount          : Decimal(17, 2) null;
        conditionCurrency   : String(5) null;
        condCurrency        : String(5) null;
}


@cds.persistence.exists
entity MaterialPricingComb12 {
    key conditionType       : String(4);
    key materialCode        : String(40);
    key condRecordNo        : String(10);
    key salesOrganization   : String(4);
    key distributionChannel : String(2);
    key plateSource         : String(40);
    key vehicleType         : String(15);
    key validTo             : String(10);
    key validFrom           : String(10);
        accessSequence      : String(4) null;
        accessNo            : String(3) null;
        tableNumber         : String(4) null;
        condAmount          : Decimal(17, 2) null;
        conditionCurrency   : String(5) null;
        condCurrency        : String(5) null;
}

@cds.persistence.exists
entity MaterialPricingComb13 {
    key conditionType       : String(4);
    key materialCode        : String(40);
    key condRecordNo        : String(10);
    key salesOrganization   : String(4);
    key distributionChannel : String(2);
    key plantCode           : String(4);
    key fromTime            : String(8);
    key toTime              : String(8);
    key validTo             : String(10);
    key validFrom           : String(10);
        accessSequence      : String(4) null;
        accessNo            : String(3) null;
        tableNumber         : String(4) null;
        condAmount          : Decimal(17, 2) null;
        conditionCurrency   : String(5) null;
        condCurrency        : String(5) null;
}

@cds.persistence.exists
entity MaterialPricingComb14 {
    key conditionType       : String(4);
    key condRecordNo        : String(10);
    key salesOrganization   : String(4);
    key distributionChannel : String(2);
    key plantCode           : String(40);
    key fromTime            : String(8);
    key toTime              : String(8);
    key validTo             : String(10);
    key validFrom           : String(10);
        accessSequence      : String(4) null;
        accessNo            : String(3) null;
        tableNumber         : String(4) null;
        condAmount          : Decimal(17, 2) null;
        conditionCurrency   : String(5) null;
        condCurrency        : String(5) null;
}

@cds.persistence.exists
entity MaterialMasters {
    key materialCode               : String(40);
    key plantCode                  : String(4);
    key distributionChannel        : String(2);
        eanNo                      : String(18) null;
        materialEnglishDescription : String(40) null;
        materialArabicDescription  : String(40) null;
        salesOrganization          : String(4) null;
        materialType               : String(4) null;
        materialGroup              : String(9) null;
        materialIns                : String(3) null;
        profitCenter               : String(10) null;
        productHierarchy           : String(18) null;
        materialStatus             : String(2) null;
}

@cds.persistence.exists
entity MaterialCharacteristicsMasters {
    key materialCode               : String(40);
    key internalCharNo             : String(10);
    key counterKey                 : String(3);
    key classType                  : String(3);
        materialEnglishDescription : String(40) null;
        charDescription            : String(30) null;
        charValue                  : String(70) null;
}

@cds.persistence.exists
entity CorrectionalProcedureMasters {
    key materialCode         : String(40);
    key materialName         : String(40);
    key plantCode            : String(4);
    key plantName            : String(30);
    key zemiratesCode        : String(3);
    key zemirates            : String(30);
    key conditionType        : String(2);
    key conditionId          : String(4);
        conditionName        : String(60) null;
        conditionTextEnglish : String(255) null;
        conditionTextArabic  : String(255) null;
        serviceStatusCode    : String(10) null;
        serviceStatusText    : String(60) null;
        lovemKo              : String(1) null;
        lovemKoStatus        : String(1) null;
}

@cds.persistence.exists
entity TermsConditionMasters {
    key materialCode         : String(40);
    key materialName         : String(40);
    key plantCode            : String(4);
    key plantName            : String(30);
    key zemiratesCode        : String(3);
    key zemirates            : String(30);
    key conditionType        : String(2);
    key conditionId          : String(4);
        conditionName        : String(60) null;
        conditionTextEnglish : String(255) null;
        conditionTextArabic  : String(255) null;
        serviceStatusCode    : String(10) null;
        serviceStatusText    : String(60) null;
        lovemKo              : String(1) null;
        lovemKoStatus        : String(1) null;
}

@cds.persistence.exists
entity ServiceRequirementMasters {
    key materialCode         : String(40);
    key materialName         : String(40);
    key plantCode            : String(4);
    key plantName            : String(30);
    key zemiratesCode        : String(3);
    key zemirates            : String(30);
    key conditionType        : String(2);
    key conditionId          : String(4);
        conditionName        : String(60) null;
        conditionTextEnglish : String(255) null;
        conditionTextArabic  : String(255) null;
        serviceStatusCode    : String(10) null;
        serviceStatusText    : String(60) null;
        lovemKo              : String(1) null;
        lovemKoStatus        : String(1) null;
}

@cds.persistence.exists
entity MaterialPricingConditionMasters {
    key conditionType : String(4);
    key accessNumber  : String(3);
        accSeqNumber  : String(4) null;
        validTo       : String(10) null;
        validFrom     : String(10) null;
        tableNumber   : String(4) null;
        tableName     : String(60) null;
}

@cds.persistence.exists
entity LogoMasters {
    key snno              : String(3);
        type              : String(40) null;
        emiratesCode      : String(10) null;
        emiratesDesc      : String(40) null;
        logoType          : String(40) null;
        filedata          : LargeString null;
        fileExtension     : String(10) null;
        link              : LargeString null;
        status            : String(1) null;
        deletionIndicator : String(1) null;
}

@cds.persistence.exists
entity MopMaster {
    key domainName : String(30);
    key valueKey   : String(4);
        mopCode    : String(4) null;
        mopText    : String(10) null;
}

@cds.persistence.exists
entity ReTestMasters {
    key snno               : String(3);
    key retestMaterialCode : String(40);
    key retestMaterialName : String(40);
    key materialCode       : String(40);
    key materialName       : String(40);
    key plantCode          : String(4);
    key emirates           : String(4);
        gracePeriodFrom    : Int16 null;
        gracePeriodTo      : Int16 null;
        retestAllowed      : String(1) null;
        sameDiff           : String(4) null;
        sameDiffText       : String(60) null;
        feeReq             : String(3) null;
        freshRetest        : String(20) null;
}

@cds.persistence.exists
entity CountryExtensionMasters {
    key country                : String(3);
        telephoneCountryPrefix : String(4) null;
        mobileDigits           : String(255) null;
}

entity MAHAPassLog : managed {
    key mahaPassLog : UUID;
        sitecode    : String(100);
        filename    : String(100);
        fileSentOn  : DateTime;
        isSentMaha  : Boolean default false;
        errorDesc   : String
}


entity orderTypeSequences : managed {
    key id        : UUID;
        orderType : String(100);
        sequences : String;
        status    : Boolean default false;
}

entity HorsePowerStageMasters {
    key horsePowerStageUUID : UUID;
        minimumPercentage   : Integer;
        maximumPercentage   : Integer;
        horsepowerStage     : Integer;
}

entity OverallStageStatusMasters {
    key overallStatusUUID : UUID;
        stage             : String(1);
        horsepowerStage   : Integer;
        OverallStage      : String(1);
}

entity ModifyStageMasters {
    key modifyStageUUID : UUID;
        modifyStageCode : Integer;
        modifyStageDesc : String(100);
}

entity orderSyncLog : managed {
    key id             : UUID;
        orderNumber    : String(500);
        customerNumber : String(500);
        orderSync      : Boolean;
        requestPayload : LargeString;
        response       : LargeString;
        errorMessage   : LargeString

}

type ResponseStatus               : {
    statusCode : String;
    statusMsg  : String;
}

type ResponseData                 : {
    FileName : Integer;
}

type ESOutResponse                : {
    responseStatus : ResponseStatus;
    responseData   : ResponseData;
}

type SendLoyaltySales {
    comment        : String;
    partner        : String;
    location       : String;
    date           : DateTime;
    currencyCode   : String;
    paymentMethod  : String;
    trnNo          : String;
    coupons        : array of String;
    lineOfBusiness : String;
    businessDate   : Date;
    products       : array of products;
    loyaltyID      : String;
    simulation     : Boolean;

}

type products {
    code       : String;
    lineNo     : Int32;
    category   : String;
    name       : String;
    quantity   : Int32;
    amount     : Int32;
    discounted : Boolean;
}

//Type getKey for V2 version
type getKey {}

//Type fetchLoyaltyDetails for V2 version
type fetchLoyaltyDetails {}

//Type getP24CustomerDetail for V2 version
type getP24CustomerDetail {}

//Type getPaymentP24 for V2 version
type getPaymentP24 {}

//Type Customer Master for V2 version
type getCustomers {
    customerUUID          : String(100);
    emiratesId            : String(100);
    firstName             : String(100);
    lastName              : String(100);
    mobileNo              : String(100);
    regionCode            : String(100);
    regionName            : String(100);
    BPGrouping            : String(100);
    extReference          : String(100);
    emailAddress          : String(100);
    companyCode           : String(100);
    salesOrganization     : String(100);
    vatRegistrationNo     : String(100);
    reconciliationAccount : String(100);
    division              : String(100);
    distributionChannel   : String(100);
    paymentTerms          : String(100);
    countryCode           : String(100);
    countryItcCode        : String(100);
    countryExtension      : String(4) null;
    delMark               : Delmark default 0;
    customerNo            : Integer64;
    commTypeWhatsapp      : Boolean default false;
    commTypeMail          : Boolean default false;
    commTypeSMS           : Boolean default false;
    prefLangEng           : Boolean default false;
    prefLangArabic        : Boolean default false;
    customerSyncS4        : String(3) default 'N';
    customerSyncMessage   : LargeString;
    isSynced              : Boolean;
    customerSyncDate      : DateTime;
    customerType          : String(100);
    idType                : String(100);
    searchTerm            : String(100);
    emiratesFromDate      : DateTime;
    emiratesToDate        : DateTime;
}

type workflowContext {
    serviceRequestNumber   : String;
    plateNumber            : String;
    inspectorEmpId         : String;
    materialCode           : String;
    materialName           : String;
    applicableTestCharName : String;
    approvalStatus         : String;
    approvalComments       : String;
    approverEmail          : String;
    inspectorEmail         : String;
    orderId                : String;
    workflowInstanceId     : String;
    taskInstanceId         : String;
    vehTestCharid          : UUID;

}

type userInfo {
    id    : String;
    email : String;
    name  : String;
};