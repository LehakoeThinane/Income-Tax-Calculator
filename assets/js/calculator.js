document.addEventListener('DOMContentLoaded', function () {
    const settings = window.satcSettings || {};
    const ajaxConfig = window.satcAjax || {};

    const incomeField = document.getElementById('satc-income');
    const incomePeriodField = document.getElementById('satc-income-period');
    const ageGroupField = document.getElementById('satc-age-group');
    const retirementField = document.getElementById('satc-retirement');
    const medicalMembersField = document.getElementById('satc-medical-members');
    const taxYearField = document.getElementById('satc-tax-year');

    const downloadButton = document.getElementById('satc-download-summary');
    const saveButton = document.getElementById('satc-save-summary');
    const saveMessage = document.getElementById('satc-save-message');

    const annualIncomeUsedOutput = document.getElementById('satc-annual-income-used');
    const retirementAmountOutput = document.getElementById('satc-retirement-amount');
    const taxableIncomeOutput = document.getElementById('satc-taxable-income');
    const thresholdUsedOutput = document.getElementById('satc-threshold-used');
    const medicalCreditMonthlyOutput = document.getElementById('satc-medical-credit-monthly');
    const medicalCreditAnnualOutput = document.getElementById('satc-medical-credit-annual');
    const annualPayeOutput = document.getElementById('satc-annual-paye');
    const monthlyPayeOutput = document.getElementById('satc-monthly-paye');
    const monthlyUifOutput = document.getElementById('satc-monthly-uif');
    const monthlyNetOutput = document.getElementById('satc-monthly-net');
    const totalAnnualDeductionsOutput = document.getElementById('satc-total-annual-deductions');
    const effectiveTaxRateOutput = document.getElementById('satc-effective-tax-rate');

    const monthlyNetHeroOutput = document.getElementById('satc-monthly-net-hero');
    const monthlyPayeHeroOutput = document.getElementById('satc-monthly-paye-hero');
    const monthlyUifHeroOutput = document.getElementById('satc-monthly-uif-hero');
    const effectiveTaxRateHeroOutput = document.getElementById('satc-effective-tax-rate-hero');

    const summaryAnnualIncomeUsedOutput = document.getElementById('satc-summary-annual-income-used');
    const summaryRetirementAmountOutput = document.getElementById('satc-summary-retirement-amount');
    const summaryTaxableIncomeOutput = document.getElementById('satc-summary-taxable-income');
    const summaryThresholdUsedOutput = document.getElementById('satc-summary-threshold-used');
    const summaryMedicalCreditMonthlyOutput = document.getElementById('satc-summary-medical-credit-monthly');
    const summaryMedicalCreditAnnualOutput = document.getElementById('satc-summary-medical-credit-annual');
    const summaryAnnualPayeOutput = document.getElementById('satc-summary-annual-paye');
    const summaryMonthlyPayeOutput = document.getElementById('satc-summary-monthly-paye');
    const summaryMonthlyUifOutput = document.getElementById('satc-summary-monthly-uif');
    const summaryTotalAnnualDeductionsOutput = document.getElementById('satc-summary-total-annual-deductions');
    const summaryEffectiveTaxRateOutput = document.getElementById('satc-summary-effective-tax-rate');
    const summaryMonthlyNetOutput = document.getElementById('satc-summary-monthly-net');

    let latestSummary = {};

    function applyBrandColors() {
        const root = document.documentElement;
        const mappings = {
            '--satc-primary': settings.brand_primary,
            '--satc-primary-dark': settings.brand_primary_dark,
            '--satc-accent': settings.brand_accent,
            '--satc-accent-dark': settings.brand_accent_dark,
            '--satc-highlight': settings.brand_highlight,
            '--satc-danger': settings.brand_danger
        };

        Object.keys(mappings).forEach(function (key) {
            if (mappings[key]) {
                root.style.setProperty(key, mappings[key]);
            }
        });
    }

    function formatCurrency(amount) {
        return 'R' + amount.toLocaleString('en-ZA', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        });
    }

    function formatPercentage(value) {
        return value.toFixed(2) + '%';
    }

    function updateText(element, value) {
        if (element) {
            element.textContent = value;
        }
    }

    function setSaveMessage(message, color) {
        if (saveMessage) {
            saveMessage.textContent = message;
            saveMessage.style.color = color || '#1d2733';
        }
    }

    function getTaxConfig() {
        return {
            thresholds: {
                under65: parseFloat(settings.threshold_under65 || 95750),
                '65to74': parseFloat(settings.threshold_65to74 || 148217),
                '75plus': parseFloat(settings.threshold_75plus || 165689)
            },
            rebates: {
                under65: parseFloat(settings.rebate_under65 || 17235),
                '65to74': parseFloat(settings.rebate_65to74 || 26679),
                '75plus': parseFloat(settings.rebate_75plus || 29824)
            },
            medicalCredits: {
                first: parseFloat(settings.medical_credit_first || 364),
                second: parseFloat(settings.medical_credit_second || 364),
                additional: parseFloat(settings.medical_credit_additional || 246)
            },
            uifRate: parseFloat(settings.uif_rate || 0.01),
            uifMonthlyCap: parseFloat(settings.uif_monthly_cap || 177.12),
            brackets: [
                { max: 237100, base: 0, rate: 0.18, threshold: 0 },
                { max: 370500, base: 42678, rate: 0.26, threshold: 237100 },
                { max: 512800, base: 77362, rate: 0.31, threshold: 370500 },
                { max: 673000, base: 121475, rate: 0.36, threshold: 512800 },
                { max: 857900, base: 179147, rate: 0.39, threshold: 673000 },
                { max: 1817000, base: 251258, rate: 0.41, threshold: 857900 },
                { max: Infinity, base: 644489, rate: 0.45, threshold: 1817000 }
            ]
        };
    }

    function getAnnualIncomeFromInput(rawIncome, incomePeriod) {
        return incomePeriod === 'monthly' ? rawIncome * 12 : rawIncome;
    }

    function calculateTaxBeforeRebate(income, brackets) {
        for (let i = 0; i < brackets.length; i++) {
            const bracket = brackets[i];
            if (income <= bracket.max) {
                return bracket.base + ((income - bracket.threshold) * bracket.rate);
            }
        }
        return 0;
    }

    function calculateMedicalTaxCredit(memberCount, medicalCredits) {
        const members = parseInt(memberCount, 10) || 0;
        if (members <= 0) return 0;
        if (members === 1) return medicalCredits.first;
        if (members === 2) return medicalCredits.first + medicalCredits.second;
        return medicalCredits.first + medicalCredits.second + ((members - 2) * medicalCredits.additional);
    }

    function calculateUIF(monthlyIncome, config) {
        let uif = monthlyIncome * config.uifRate;
        if (uif > config.uifMonthlyCap) {
            uif = config.uifMonthlyCap;
        }
        return uif;
    }

    function hexToRgb(hex) {
        if (!hex) return [22, 58, 95];

        const cleaned = hex.replace('#', '');
        const normalized = cleaned.length === 3
            ? cleaned.split('').map(function (c) { return c + c; }).join('')
            : cleaned;

        const bigint = parseInt(normalized, 16);
        if (Number.isNaN(bigint)) return [22, 58, 95];

        return [
            (bigint >> 16) & 255,
            (bigint >> 8) & 255,
            bigint & 255
        ];
    }

    function addFooter(doc, footerText) {
        const pageCount = doc.getNumberOfPages();

        for (let i = 1; i <= pageCount; i++) {
            doc.setPage(i);
            doc.setDrawColor(220, 226, 233);
            doc.line(20, 285, 190, 285);
            doc.setFont('helvetica', 'normal');
            doc.setFontSize(9);
            doc.setTextColor(95, 107, 120);
            doc.text(footerText, 20, 291);
            doc.text('Page ' + i + ' of ' + pageCount, 190, 291, { align: 'right' });
        }
    }

    function addSummaryRow(doc, label, value, xLabel, xValue, y, rowHeight) {
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(10);
        doc.setTextColor(29, 39, 51);
        doc.text(label, xLabel, y);
        doc.text(value, xValue, y, { align: 'right' });
        doc.setDrawColor(220, 226, 233);
        doc.line(20, y + 4, 190, y + 4);
        return y + rowHeight;
    }

    function splitText(doc, text, width) {
        return doc.splitTextToSize(text, width);
    }

    function getJsPdfConstructor() {
        if (window.jspdf && window.jspdf.jsPDF) {
            return window.jspdf.jsPDF;
        }

        if (window.jsPDF) {
            return window.jsPDF;
        }

        return null;
    }

    function loadImageAsDataUrl(url) {
        return fetch(url)
            .then(function (response) {
                if (!response.ok) {
                    throw new Error('Image fetch failed');
                }
                return response.blob();
            })
            .then(function (blob) {
                return new Promise(function (resolve, reject) {
                    const reader = new FileReader();
                    reader.onloadend = function () {
                        resolve(reader.result);
                    };
                    reader.onerror = reject;
                    reader.readAsDataURL(blob);
                });
            });
    }

    async function buildPdfDocument() {
        const JsPdfConstructor = getJsPdfConstructor();

        if (!JsPdfConstructor) {
            throw new Error('PDF library did not load.');
        }

        const doc = new JsPdfConstructor({
            orientation: 'portrait',
            unit: 'mm',
            format: 'a4'
        });

        const primary = hexToRgb(settings.brand_primary || '#163a5f');
        const accent = hexToRgb(settings.brand_accent || '#c8a24a');
        const dark = hexToRgb(settings.brand_primary_dark || '#102c49');
        const footerText = settings.pdf_footer_text || 'Generated by the SA Tax Calculator';
        const companyName = settings.pdf_company_name || 'Tax Consulting South Africa';
        const disclaimerTitle = settings.pdf_disclaimer_title || 'Assumptions and Disclaimer';
        const disclaimerBody = settings.pdf_disclaimer_body || 'This calculator provides an estimate only.';
        const logoUrl = settings.pdf_logo_url || '';

        let logoDataUrl = null;

        if (logoUrl) {
            try {
                logoDataUrl = await loadImageAsDataUrl(logoUrl);
            } catch (error) {
                console.warn('Logo could not be loaded for PDF export.', error);
            }
        }

        doc.setFillColor(primary[0], primary[1], primary[2]);
        doc.rect(0, 0, 210, 42, 'F');

        if (logoDataUrl) {
            try {
                doc.addImage(logoDataUrl, 'PNG', 20, 10, 32, 16);
            } catch (error) {
                console.warn('Logo could not be added to PDF.', error);
            }
        }

        doc.setTextColor(255, 255, 255);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(18);
        doc.text(companyName, 190, 17, { align: 'right' });

        doc.setFont('helvetica', 'normal');
        doc.setFontSize(10);
        doc.text('South Africa Income Tax Summary', 190, 25, { align: 'right' });
        doc.text('Generated from the SA Tax Calculator', 190, 31, { align: 'right' });

        doc.setFillColor(accent[0], accent[1], accent[2]);
        doc.roundedRect(20, 50, 170, 26, 4, 4, 'F');

        doc.setTextColor(255, 255, 255);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(11);
        doc.text('Estimated Monthly Take-Home', 25, 60);
        doc.setFontSize(19);
        doc.text(latestSummary.monthlyNetText || 'R0.00', 25, 70);

        doc.setTextColor(dark[0], dark[1], dark[2]);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(13);
        doc.text('Inputs', 20, 90);

        let y = 98;
        const rowHeight = 9;
        const xLabel = 20;
        const xValue = 190;

        y = addSummaryRow(doc, 'Tax Year', latestSummary.taxYearLabel || '2025 / 2026', xLabel, xValue, y, rowHeight);
        y = addSummaryRow(doc, 'Income Period', latestSummary.incomePeriodLabel || 'Annual Income', xLabel, xValue, y, rowHeight);
        y = addSummaryRow(doc, 'Age Group', latestSummary.ageGroupLabel || 'Under 65', xLabel, xValue, y, rowHeight);
        y = addSummaryRow(doc, 'Income Entered', latestSummary.rawIncomeText || 'R0.00', xLabel, xValue, y, rowHeight);
        y = addSummaryRow(doc, 'Retirement Contribution %', latestSummary.retirementPercentText || '0.0%', xLabel, xValue, y, rowHeight);
        y = addSummaryRow(doc, 'Medical Aid Members', latestSummary.medicalMembersLabel || 'No medical aid', xLabel, xValue, y, rowHeight);

        y += 8;

        doc.setFont('helvetica', 'bold');
        doc.setFontSize(13);
        doc.text('Calculation Summary', 20, y);
        y += 8;

        y = addSummaryRow(doc, 'Annual Income Used', latestSummary.annualIncomeText || 'R0.00', xLabel, xValue, y, rowHeight);
        y = addSummaryRow(doc, 'Retirement Contribution', latestSummary.retirementAmountText || 'R0.00', xLabel, xValue, y, rowHeight);
        y = addSummaryRow(doc, 'Taxable Income', latestSummary.taxableIncomeText || 'R0.00', xLabel, xValue, y, rowHeight);
        y = addSummaryRow(doc, 'Tax Threshold Applied', latestSummary.thresholdText || 'R0.00', xLabel, xValue, y, rowHeight);
        y = addSummaryRow(doc, 'Medical Tax Credit (Monthly)', latestSummary.medicalCreditMonthlyText || 'R0.00', xLabel, xValue, y, rowHeight);
        y = addSummaryRow(doc, 'Medical Tax Credit (Annual)', latestSummary.medicalCreditAnnualText || 'R0.00', xLabel, xValue, y, rowHeight);
        y = addSummaryRow(doc, 'Annual PAYE', latestSummary.annualPayeText || 'R0.00', xLabel, xValue, y, rowHeight);
        y = addSummaryRow(doc, 'Monthly PAYE', latestSummary.monthlyPayeText || 'R0.00', xLabel, xValue, y, rowHeight);
        y = addSummaryRow(doc, 'Monthly UIF', latestSummary.monthlyUifText || 'R0.00', xLabel, xValue, y, rowHeight);
        y = addSummaryRow(doc, 'Total Annual Deductions', latestSummary.totalAnnualDeductionsText || 'R0.00', xLabel, xValue, y, rowHeight);
        y = addSummaryRow(doc, 'Effective Tax Rate', latestSummary.effectiveTaxRateText || '0.00%', xLabel, xValue, y, rowHeight);

        y += 8;

        doc.setFillColor(238, 243, 248);
        doc.roundedRect(20, y, 170, 16, 3, 3, 'F');
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(dark[0], dark[1], dark[2]);
        doc.text('Estimated Monthly Take-Home', 24, y + 10);
        doc.text(latestSummary.monthlyNetText || 'R0.00', 186, y + 10, { align: 'right' });

        doc.addPage();

        doc.setFillColor(primary[0], primary[1], primary[2]);
        doc.rect(0, 0, 210, 28, 'F');

        doc.setTextColor(255, 255, 255);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(16);
        doc.text(disclaimerTitle, 20, 18);

        doc.setTextColor(dark[0], dark[1], dark[2]);
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(11);

        const disclaimerLines = splitText(doc, disclaimerBody, 170);
        doc.text(disclaimerLines, 20, 42);

        const assumptionsTitleY = 90;
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(13);
        doc.text('Included in this estimator', 20, assumptionsTitleY);

        doc.setFont('helvetica', 'normal');
        doc.setFontSize(11);
        const includedLines = [
            '• Annualised income based on the selected input period',
            '• Age-based thresholds and rebates',
            '• Retirement contribution percentage reducing taxable income',
            '• Medical tax credits based on selected members',
            '• UIF using the configured rate and monthly cap'
        ];
        doc.text(includedLines, 24, assumptionsTitleY + 12);

        doc.setFont('helvetica', 'bold');
        doc.setFontSize(13);
        doc.text('Not fully covered in this estimator', 20, 145);

        doc.setFont('helvetica', 'normal');
        doc.setFontSize(11);
        const excludedLines = [
            '• Complex fringe benefits and employer-specific remuneration rules',
            '• Advanced payroll rounding or company-specific policies',
            '• Travel allowances, company cars, bonuses, and unusual earnings patterns',
            '• Formal tax advice, SARS rulings, or legal interpretation'
        ];
        doc.text(excludedLines, 24, 157);

        addFooter(doc, footerText);

        return doc;
    }

    async function downloadPdfSummary() {
        const doc = await buildPdfDocument();
        const fileName = 'sa-tax-summary-' + new Date().toISOString().slice(0, 10) + '.pdf';
        doc.save(fileName);
    }

    function blobToBase64(blob) {
        return new Promise(function (resolve, reject) {
            const reader = new FileReader();

            reader.onloadend = function () {
                resolve(reader.result);
            };

            reader.onerror = reject;
            reader.readAsDataURL(blob);
        });
    }

    async function savePdfToMediaLibrary() {
        if (!ajaxConfig.ajax_url || !ajaxConfig.nonce) {
            throw new Error('AJAX configuration is missing.');
        }

        setSaveMessage('Saving PDF to Media Library...', '#163a5f');

        const doc = await buildPdfDocument();
        const blob = doc.output('blob');
        const base64Data = await blobToBase64(blob);

        const fileName = 'sa-tax-summary-' + new Date().toISOString().slice(0, 10) + '.pdf';

        const formData = new FormData();
        formData.append('action', 'satc_save_pdf_to_media');
        formData.append('nonce', ajaxConfig.nonce);
        formData.append('pdf_base64', base64Data);
        formData.append('file_name', fileName);

        const response = await fetch(ajaxConfig.ajax_url, {
            method: 'POST',
            body: formData
        });

        const result = await response.json();

        if (!result.success) {
            throw new Error(result.data && result.data.message ? result.data.message : 'Saving failed.');
        }

        const savedUrl = result.data && result.data.url ? result.data.url : '';
        const successMessage = savedUrl
            ? 'PDF saved successfully. File URL: ' + savedUrl
            : 'PDF saved successfully.';

        setSaveMessage(successMessage, '#1f7a3d');
    }

    function calculate() {
        const rawIncome = parseFloat(incomeField.value) || 0;
        const incomePeriod = incomePeriodField.value;
        const ageGroup = ageGroupField.value;
        const retirementPercent = parseFloat(retirementField.value) || 0;
        const medicalMembers = parseInt(medicalMembersField.value, 10) || 0;
        const taxYear = taxYearField.value;

        const config = getTaxConfig();

        const annualIncome = getAnnualIncomeFromInput(rawIncome, incomePeriod);
        const retirementAmount = annualIncome * (retirementPercent / 100);
        const taxableIncome = Math.max(annualIncome - retirementAmount, 0);
        const threshold = config.thresholds[ageGroup];
        const ageRebate = config.rebates[ageGroup];

        const monthlyMedicalCredit = calculateMedicalTaxCredit(medicalMembers, config.medicalCredits);
        const annualMedicalCredit = monthlyMedicalCredit * 12;

        let annualPayeBeforeMedical = 0;
        if (taxableIncome > threshold) {
            annualPayeBeforeMedical = calculateTaxBeforeRebate(taxableIncome, config.brackets) - ageRebate;
            if (annualPayeBeforeMedical < 0) annualPayeBeforeMedical = 0;
        }

        let annualPaye = annualPayeBeforeMedical - annualMedicalCredit;
        if (annualPaye < 0) annualPaye = 0;

        const monthlyPaye = annualPaye / 12;
        const monthlyGross = annualIncome / 12;
        const monthlyUif = calculateUIF(monthlyGross, config);
        const annualUif = monthlyUif * 12;
        const monthlyNet = monthlyGross - monthlyPaye - monthlyUif;
        const totalAnnualDeductions = annualPaye + annualUif;
        const effectiveTaxRate = annualIncome > 0 ? (annualPaye / annualIncome) * 100 : 0;

        const annualIncomeText = formatCurrency(annualIncome);
        const retirementAmountText = formatCurrency(retirementAmount);
        const taxableIncomeText = formatCurrency(taxableIncome);
        const thresholdText = formatCurrency(threshold);
        const medicalCreditMonthlyText = formatCurrency(monthlyMedicalCredit);
        const medicalCreditAnnualText = formatCurrency(annualMedicalCredit);
        const annualPayeText = formatCurrency(annualPaye);
        const monthlyPayeText = formatCurrency(monthlyPaye);
        const monthlyUifText = formatCurrency(monthlyUif);
        const monthlyNetText = formatCurrency(monthlyNet);
        const totalAnnualDeductionsText = formatCurrency(totalAnnualDeductions);
        const effectiveTaxRateText = formatPercentage(effectiveTaxRate);

        [
            [annualIncomeUsedOutput, annualIncomeText],
            [retirementAmountOutput, retirementAmountText],
            [taxableIncomeOutput, taxableIncomeText],
            [thresholdUsedOutput, thresholdText],
            [medicalCreditMonthlyOutput, medicalCreditMonthlyText],
            [medicalCreditAnnualOutput, medicalCreditAnnualText],
            [annualPayeOutput, annualPayeText],
            [monthlyPayeOutput, monthlyPayeText],
            [monthlyUifOutput, monthlyUifText],
            [monthlyNetOutput, monthlyNetText],
            [totalAnnualDeductionsOutput, totalAnnualDeductionsText],
            [effectiveTaxRateOutput, effectiveTaxRateText],

            [monthlyNetHeroOutput, monthlyNetText],
            [monthlyPayeHeroOutput, monthlyPayeText],
            [monthlyUifHeroOutput, monthlyUifText],
            [effectiveTaxRateHeroOutput, effectiveTaxRateText],

            [summaryAnnualIncomeUsedOutput, annualIncomeText],
            [summaryRetirementAmountOutput, retirementAmountText],
            [summaryTaxableIncomeOutput, taxableIncomeText],
            [summaryThresholdUsedOutput, thresholdText],
            [summaryMedicalCreditMonthlyOutput, medicalCreditMonthlyText],
            [summaryMedicalCreditAnnualOutput, medicalCreditAnnualText],
            [summaryAnnualPayeOutput, annualPayeText],
            [summaryMonthlyPayeOutput, monthlyPayeText],
            [summaryMonthlyUifOutput, monthlyUifText],
            [summaryTotalAnnualDeductionsOutput, totalAnnualDeductionsText],
            [summaryEffectiveTaxRateOutput, effectiveTaxRateText],
            [summaryMonthlyNetOutput, monthlyNetText]
        ].forEach(function (pair) {
            updateText(pair[0], pair[1]);
        });

        latestSummary = {
            taxYearLabel: taxYear === '2026' ? '2025 / 2026' : taxYear,
            incomePeriodLabel: incomePeriod === 'monthly' ? 'Monthly Income' : 'Annual Income',
            ageGroupLabel:
                ageGroup === 'under65'
                    ? 'Under 65'
                    : ageGroup === '65to74'
                    ? '65 to 74'
                    : '75+',
            rawIncomeText: formatCurrency(rawIncome),
            retirementPercentText: retirementPercent.toFixed(1) + '%',
            medicalMembersLabel: medicalMembers === 0 ? 'No medical aid' : medicalMembers + ' member(s)',
            annualIncomeText: annualIncomeText,
            retirementAmountText: retirementAmountText,
            taxableIncomeText: taxableIncomeText,
            thresholdText: thresholdText,
            medicalCreditMonthlyText: medicalCreditMonthlyText,
            medicalCreditAnnualText: medicalCreditAnnualText,
            annualPayeText: annualPayeText,
            monthlyPayeText: monthlyPayeText,
            monthlyUifText: monthlyUifText,
            totalAnnualDeductionsText: totalAnnualDeductionsText,
            monthlyNetText: monthlyNetText,
            effectiveTaxRateText: effectiveTaxRateText
        };
    }

    applyBrandColors();
    calculate();

    [incomeField, incomePeriodField, ageGroupField, retirementField, medicalMembersField, taxYearField].forEach(function (el) {
        if (el) {
            el.addEventListener('input', calculate);
            el.addEventListener('change', calculate);
        }
    });

    if (downloadButton) {
        downloadButton.addEventListener('click', function () {
            downloadPdfSummary().catch(function (error) {
                console.error(error);
                alert('The PDF could not be generated. Please refresh and try again.');
            });
        });
    }

    if (saveButton) {
        saveButton.addEventListener('click', function () {
            savePdfToMediaLibrary().catch(function (error) {
                console.error(error);
                setSaveMessage('Saving failed: ' + error.message, '#c44b3d');
            });
        });
    }
});
