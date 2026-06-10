export const demoModules = [
  {
    name: 'SCMS_Web',
    type: 'End User',
    screens: [
      {
        name: 'PatientDashboard',
        flow: 'MainFlow',
        blocks: [
          {
            name: 'PatientHeaderBlock',
            sourceModule: 'PatientUI_Lib',
            blocks: [
              {
                name: 'NRICDisplayBlock',
                sourceModule: 'SecurityUtils_Lib',
                blocks: [
                  { name: 'EncryptedTextField', sourceModule: 'SecurityUtils_Lib', blocks: [] },
                ],
              },
              {
                name: 'AvatarBlock',
                sourceModule: 'CoreWidgets_Lib',
                blocks: [],
              },
            ],
          },
          {
            name: 'CareplanSummaryBlock',
            sourceModule: 'PatientUI_Lib',
            blocks: [
              {
                name: 'StatusBadgeBlock',
                sourceModule: 'CoreWidgets_Lib',
                blocks: [],
              },
              {
                name: 'DateRangeDisplayBlock',
                sourceModule: 'FormComponents_Lib',
                blocks: [
                  { name: 'CalendarIconBlock', sourceModule: 'CoreWidgets_Lib', blocks: [] },
                ],
              },
            ],
          },
          {
            name: 'AlertBannerBlock',
            sourceModule: 'CoreWidgets_Lib',
            blocks: [],
          },
          {
            name: 'QuickActionsBlock',
            sourceModule: 'SCMS_Web',
            blocks: [
              { name: 'ActionButtonBlock', sourceModule: 'CoreWidgets_Lib', blocks: [] },
            ],
          },
        ],
      },
      {
        name: 'CareplanForm',
        flow: 'MainFlow',
        blocks: [
          {
            name: 'FormHeaderBlock',
            sourceModule: 'FormComponents_Lib',
            blocks: [
              { name: 'BreadcrumbBlock', sourceModule: 'CoreWidgets_Lib', blocks: [] },
            ],
          },
          {
            name: 'PatientSelectorBlock',
            sourceModule: 'PatientUI_Lib',
            blocks: [
              {
                name: 'SearchInputBlock',
                sourceModule: 'FormComponents_Lib',
                blocks: [
                  { name: 'InputValidationBlock', sourceModule: 'FormComponents_Lib', blocks: [] },
                ],
              },
              { name: 'NRICDisplayBlock', sourceModule: 'SecurityUtils_Lib', blocks: [] },
            ],
          },
          {
            name: 'DiagnosisPickerBlock',
            sourceModule: 'SCMS_Web',
            blocks: [
              { name: 'DropdownBlock', sourceModule: 'FormComponents_Lib', blocks: [] },
              { name: 'TagListBlock', sourceModule: 'CoreWidgets_Lib', blocks: [] },
            ],
          },
          {
            name: 'FormFooterBlock',
            sourceModule: 'FormComponents_Lib',
            blocks: [
              { name: 'ActionButtonBlock', sourceModule: 'CoreWidgets_Lib', blocks: [] },
              { name: 'ActionButtonBlock', sourceModule: 'CoreWidgets_Lib', blocks: [] },
            ],
          },
        ],
      },
      {
        name: 'VisitList',
        flow: 'MainFlow',
        blocks: [
          {
            name: 'ListFilterBar',
            sourceModule: 'CoreWidgets_Lib',
            blocks: [
              { name: 'DateRangeDisplayBlock', sourceModule: 'FormComponents_Lib', blocks: [] },
              { name: 'DropdownBlock', sourceModule: 'FormComponents_Lib', blocks: [] },
            ],
          },
          {
            name: 'VisitRowBlock',
            sourceModule: 'SCMS_Web',
            blocks: [
              { name: 'StatusBadgeBlock', sourceModule: 'CoreWidgets_Lib', blocks: [] },
              { name: 'AvatarBlock', sourceModule: 'CoreWidgets_Lib', blocks: [] },
            ],
          },
          {
            name: 'PaginationBlock',
            sourceModule: 'CoreWidgets_Lib',
            blocks: [],
          },
        ],
      },
      {
        name: 'AdmissionForm',
        flow: 'AdmissionFlow',
        blocks: [
          {
            name: 'FormHeaderBlock',
            sourceModule: 'FormComponents_Lib',
            blocks: [
              { name: 'BreadcrumbBlock', sourceModule: 'CoreWidgets_Lib', blocks: [] },
            ],
          },
          {
            name: 'IdentityVerificationBlock',
            sourceModule: 'SecurityUtils_Lib',
            blocks: [
              {
                name: 'NRICDisplayBlock',
                sourceModule: 'SecurityUtils_Lib',
                blocks: [
                  { name: 'EncryptedTextField', sourceModule: 'SecurityUtils_Lib', blocks: [] },
                ],
              },
              { name: 'BiometricCaptureBlock', sourceModule: 'SecurityUtils_Lib', blocks: [] },
            ],
          },
          {
            name: 'AdmissionDetailsBlock',
            sourceModule: 'SCMS_Web',
            blocks: [
              { name: 'WardSelectorBlock', sourceModule: 'SCMS_Web', blocks: [
                { name: 'DropdownBlock', sourceModule: 'FormComponents_Lib', blocks: [] },
              ]},
              { name: 'DateRangeDisplayBlock', sourceModule: 'FormComponents_Lib', blocks: [] },
            ],
          },
          {
            name: 'AlertBannerBlock',
            sourceModule: 'CoreWidgets_Lib',
            blocks: [],
          },
        ],
      },
    ],
  },
  {
    name: 'VMS_Web',
    type: 'End User',
    screens: [
      {
        name: 'VolunteerDashboard',
        flow: 'MainFlow',
        blocks: [
          {
            name: 'VolunteerHeaderBlock',
            sourceModule: 'VMS_Web',
            blocks: [
              { name: 'AvatarBlock', sourceModule: 'CoreWidgets_Lib', blocks: [] },
              { name: 'StatusBadgeBlock', sourceModule: 'CoreWidgets_Lib', blocks: [] },
            ],
          },
          {
            name: 'ShiftCalendarBlock',
            sourceModule: 'VMS_Web',
            blocks: [
              { name: 'CalendarIconBlock', sourceModule: 'CoreWidgets_Lib', blocks: [] },
              { name: 'DateRangeDisplayBlock', sourceModule: 'FormComponents_Lib', blocks: [] },
            ],
          },
          {
            name: 'AlertBannerBlock',
            sourceModule: 'CoreWidgets_Lib',
            blocks: [],
          },
        ],
      },
      {
        name: 'GantryEventLog',
        flow: 'MainFlow',
        blocks: [
          {
            name: 'ListFilterBar',
            sourceModule: 'CoreWidgets_Lib',
            blocks: [
              { name: 'DateRangeDisplayBlock', sourceModule: 'FormComponents_Lib', blocks: [] },
            ],
          },
          {
            name: 'GantryEventRowBlock',
            sourceModule: 'VMS_Web',
            blocks: [
              { name: 'StatusBadgeBlock', sourceModule: 'CoreWidgets_Lib', blocks: [] },
              {
                name: 'NRICDisplayBlock',
                sourceModule: 'SecurityUtils_Lib',
                blocks: [
                  { name: 'EncryptedTextField', sourceModule: 'SecurityUtils_Lib', blocks: [] },
                ],
              },
            ],
          },
          { name: 'PaginationBlock', sourceModule: 'CoreWidgets_Lib', blocks: [] },
        ],
      },
      {
        name: 'VisitorCheckIn',
        flow: 'CheckInFlow',
        blocks: [
          {
            name: 'IdentityVerificationBlock',
            sourceModule: 'SecurityUtils_Lib',
            blocks: [
              {
                name: 'NRICDisplayBlock',
                sourceModule: 'SecurityUtils_Lib',
                blocks: [
                  { name: 'EncryptedTextField', sourceModule: 'SecurityUtils_Lib', blocks: [] },
                ],
              },
              { name: 'BiometricCaptureBlock', sourceModule: 'SecurityUtils_Lib', blocks: [] },
            ],
          },
          {
            name: 'VisitorDetailsForm',
            sourceModule: 'VMS_Web',
            blocks: [
              { name: 'SearchInputBlock', sourceModule: 'FormComponents_Lib', blocks: [] },
              { name: 'DropdownBlock', sourceModule: 'FormComponents_Lib', blocks: [] },
              { name: 'InputValidationBlock', sourceModule: 'FormComponents_Lib', blocks: [] },
            ],
          },
          {
            name: 'AlertBannerBlock',
            sourceModule: 'CoreWidgets_Lib',
            blocks: [],
          },
          {
            name: 'FormFooterBlock',
            sourceModule: 'FormComponents_Lib',
            blocks: [
              { name: 'ActionButtonBlock', sourceModule: 'CoreWidgets_Lib', blocks: [] },
            ],
          },
        ],
      },
    ],
  },
]
