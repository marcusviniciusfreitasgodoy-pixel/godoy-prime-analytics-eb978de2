const BASE_YEAR = 2020;

export function getReportYearOptions() {
  const currentYear = new Date().getFullYear();

  return [
    { value: '', label: 'Todos os anos' },
    ...Array.from({ length: currentYear - BASE_YEAR + 1 }, (_, index) => {
      const year = String(currentYear - index);
      return { value: year, label: year };
    }),
  ];
}

export function getCompactReportYearOptions() {
  const [allOption, ...yearOptions] = getReportYearOptions();

  return [
    { ...allOption, label: 'Todos' },
    ...yearOptions,
  ];
}