<?php
/**
 * Romanian Calendar & Holidays Service
 * Handles Romanian public holidays, Orthodox Easter calculations,
 * business days, and fiscal calendar deadlines
 */

class RomanianCalendarService
{
    private static ?RomanianCalendarService $instance = null;

    // Romanian public holidays (fixed dates)
    private array $fixedHolidays = [
        '01-01' => ['name_ro' => 'Anul Nou', 'name_en' => 'New Year\'s Day'],
        '01-02' => ['name_ro' => 'A doua zi de Anul Nou', 'name_en' => 'Day after New Year'],
        '01-24' => ['name_ro' => 'Ziua Unirii Principatelor Române', 'name_en' => 'Unification Day'],
        '05-01' => ['name_ro' => 'Ziua Muncii', 'name_en' => 'Labour Day'],
        '06-01' => ['name_ro' => 'Ziua Copilului', 'name_en' => 'Children\'s Day'],
        '08-15' => ['name_ro' => 'Adormirea Maicii Domnului', 'name_en' => 'Assumption of Mary'],
        '11-30' => ['name_ro' => 'Sfântul Andrei', 'name_en' => 'Saint Andrew\'s Day'],
        '12-01' => ['name_ro' => 'Ziua Națională a României', 'name_en' => 'National Day of Romania'],
        '12-25' => ['name_ro' => 'Crăciunul', 'name_en' => 'Christmas Day'],
        '12-26' => ['name_ro' => 'A doua zi de Crăciun', 'name_en' => 'Second Day of Christmas']
    ];

    // Fiscal deadlines (day of month)
    private array $fiscalDeadlines = [
        'tva_monthly' => [
            'day' => 25,
            'name_ro' => 'Declarație TVA lunară',
            'name_en' => 'Monthly VAT Declaration',
            'description_ro' => 'Declarația și plata TVA pentru luna precedentă',
            'description_en' => 'VAT declaration and payment for previous month'
        ],
        'tva_quarterly' => [
            'day' => 25,
            'months' => [1, 4, 7, 10],
            'name_ro' => 'Declarație TVA trimestrială',
            'name_en' => 'Quarterly VAT Declaration',
            'description_ro' => 'Declarația și plata TVA pentru trimestrul precedent',
            'description_en' => 'VAT declaration and payment for previous quarter'
        ],
        'income_tax' => [
            'day' => 25,
            'name_ro' => 'Impozit pe venit',
            'name_en' => 'Income Tax',
            'description_ro' => 'Plata impozitului pe venit pentru luna precedentă',
            'description_en' => 'Income tax payment for previous month'
        ],
        'social_contributions' => [
            'day' => 25,
            'name_ro' => 'Contribuții sociale',
            'name_en' => 'Social Contributions',
            'description_ro' => 'Plata CAS, CASS pentru luna precedentă',
            'description_en' => 'CAS, CASS payment for previous month'
        ],
        'profit_tax_quarterly' => [
            'day' => 25,
            'months' => [1, 4, 7, 10],
            'name_ro' => 'Impozit pe profit trimestrial',
            'name_en' => 'Quarterly Profit Tax',
            'description_ro' => 'Declarația și plata impozitului pe profit trimestrial',
            'description_en' => 'Quarterly profit tax declaration and payment'
        ],
        'profit_tax_annual' => [
            'day' => 25,
            'months' => [3],
            'name_ro' => 'Impozit pe profit anual',
            'name_en' => 'Annual Profit Tax',
            'description_ro' => 'Declarația anuală a impozitului pe profit',
            'description_en' => 'Annual profit tax declaration'
        ],
        'dividend_tax' => [
            'day' => 25,
            'name_ro' => 'Impozit pe dividende',
            'name_en' => 'Dividend Tax',
            'description_ro' => 'Plata impozitului pe dividende',
            'description_en' => 'Dividend tax payment'
        ],
        'intrastat' => [
            'day' => 15,
            'name_ro' => 'Declarație Intrastat',
            'name_en' => 'Intrastat Declaration',
            'description_ro' => 'Declarația Intrastat pentru luna precedentă',
            'description_en' => 'Intrastat declaration for previous month'
        ],
        'efactura' => [
            'day' => 5,
            'name_ro' => 'Raportare e-Factura',
            'name_en' => 'e-Invoice Reporting',
            'description_ro' => 'Raportare e-Factura în sistemul RO e-Factura',
            'description_en' => 'e-Invoice reporting in RO e-Invoice system'
        ]
    ];

    private function __construct() {}

    public static function getInstance(): RomanianCalendarService
    {
        if (self::$instance === null) {
            self::$instance = new self();
        }
        return self::$instance;
    }

    /**
     * Calculate Orthodox Easter date for a given year
     * Uses the Anonymous Gregorian algorithm
     */
    public function getOrthodoxEaster(int $year): DateTime
    {
        // Julian calendar Easter calculation
        $a = $year % 4;
        $b = $year % 7;
        $c = $year % 19;
        $d = (19 * $c + 15) % 30;
        $e = (2 * $a + 4 * $b - $d + 34) % 7;
        $month = floor(($d + $e + 114) / 31);
        $day = (($d + $e + 114) % 31) + 1;

        // Create Julian date
        $julianDate = new DateTime("$year-$month-$day");

        // Convert to Gregorian (add 13 days for 21st century)
        $century = floor($year / 100);
        $correction = $century - floor($century / 4) - 2;
        $julianDate->modify("+{$correction} days");

        return $julianDate;
    }

    /**
     * Get Catholic Easter date for a given year
     * Uses the Anonymous Gregorian algorithm
     */
    public function getCatholicEaster(int $year): DateTime
    {
        $a = $year % 19;
        $b = floor($year / 100);
        $c = $year % 100;
        $d = floor($b / 4);
        $e = $b % 4;
        $f = floor(($b + 8) / 25);
        $g = floor(($b - $f + 1) / 3);
        $h = (19 * $a + $b - $d - $g + 15) % 30;
        $i = floor($c / 4);
        $k = $c % 4;
        $l = (32 + 2 * $e + 2 * $i - $h - $k) % 7;
        $m = floor(($a + 11 * $h + 22 * $l) / 451);
        $month = floor(($h + $l - 7 * $m + 114) / 31);
        $day = (($h + $l - 7 * $m + 114) % 31) + 1;

        return new DateTime("$year-$month-$day");
    }

    /**
     * Get all public holidays for a given year
     */
    public function getHolidays(int $year, string $lang = 'ro'): array
    {
        $holidays = [];
        $nameKey = "name_$lang";

        // Add fixed holidays
        foreach ($this->fixedHolidays as $date => $info) {
            $holidays[] = [
                'date' => "$year-$date",
                'name' => $info[$nameKey] ?? $info['name_ro'],
                'type' => 'fixed',
                'is_national' => true
            ];
        }

        // Add Orthodox Easter and related holidays
        $orthodoxEaster = $this->getOrthodoxEaster($year);

        // Good Friday (2 days before Easter)
        $goodFriday = clone $orthodoxEaster;
        $goodFriday->modify('-2 days');
        $holidays[] = [
            'date' => $goodFriday->format('Y-m-d'),
            'name' => $lang === 'en' ? 'Good Friday (Orthodox)' : 'Vinerea Mare (Ortodoxă)',
            'type' => 'orthodox_easter',
            'is_national' => true
        ];

        // Easter Sunday
        $holidays[] = [
            'date' => $orthodoxEaster->format('Y-m-d'),
            'name' => $lang === 'en' ? 'Easter Sunday (Orthodox)' : 'Paștele (Ortodox)',
            'type' => 'orthodox_easter',
            'is_national' => true
        ];

        // Easter Monday
        $easterMonday = clone $orthodoxEaster;
        $easterMonday->modify('+1 day');
        $holidays[] = [
            'date' => $easterMonday->format('Y-m-d'),
            'name' => $lang === 'en' ? 'Easter Monday (Orthodox)' : 'A doua zi de Paște (Ortodox)',
            'type' => 'orthodox_easter',
            'is_national' => true
        ];

        // Pentecost (50 days after Easter)
        $pentecost = clone $orthodoxEaster;
        $pentecost->modify('+49 days');
        $holidays[] = [
            'date' => $pentecost->format('Y-m-d'),
            'name' => $lang === 'en' ? 'Pentecost (Orthodox)' : 'Rusaliile (Ortodox)',
            'type' => 'orthodox_easter',
            'is_national' => true
        ];

        // Pentecost Monday
        $pentecostMonday = clone $pentecost;
        $pentecostMonday->modify('+1 day');
        $holidays[] = [
            'date' => $pentecostMonday->format('Y-m-d'),
            'name' => $lang === 'en' ? 'Pentecost Monday (Orthodox)' : 'A doua zi de Rusalii (Ortodox)',
            'type' => 'orthodox_easter',
            'is_national' => true
        ];

        // Sort by date
        usort($holidays, function ($a, $b) {
            return strcmp($a['date'], $b['date']);
        });

        return $holidays;
    }

    /**
     * Check if a date is a public holiday
     */
    public function isHoliday(string $date): bool
    {
        $dateObj = new DateTime($date);
        $year = (int)$dateObj->format('Y');
        $holidays = $this->getHolidays($year);

        foreach ($holidays as $holiday) {
            if ($holiday['date'] === $date) {
                return true;
            }
        }

        return false;
    }

    /**
     * Check if a date is a business day
     */
    public function isBusinessDay(string $date): bool
    {
        $dateObj = new DateTime($date);
        $dayOfWeek = (int)$dateObj->format('N');

        // Saturday (6) or Sunday (7)
        if ($dayOfWeek >= 6) {
            return false;
        }

        // Check if it's a holiday
        if ($this->isHoliday($date)) {
            return false;
        }

        return true;
    }

    /**
     * Get next business day from a given date
     */
    public function getNextBusinessDay(string $date): string
    {
        $dateObj = new DateTime($date);
        $dateObj->modify('+1 day');

        while (!$this->isBusinessDay($dateObj->format('Y-m-d'))) {
            $dateObj->modify('+1 day');
        }

        return $dateObj->format('Y-m-d');
    }

    /**
     * Add business days to a date
     */
    public function addBusinessDays(string $date, int $days): string
    {
        $dateObj = new DateTime($date);
        $added = 0;

        while ($added < $days) {
            $dateObj->modify('+1 day');
            if ($this->isBusinessDay($dateObj->format('Y-m-d'))) {
                $added++;
            }
        }

        return $dateObj->format('Y-m-d');
    }

    /**
     * Count business days between two dates
     */
    public function countBusinessDays(string $startDate, string $endDate): int
    {
        $start = new DateTime($startDate);
        $end = new DateTime($endDate);
        $count = 0;

        while ($start <= $end) {
            if ($this->isBusinessDay($start->format('Y-m-d'))) {
                $count++;
            }
            $start->modify('+1 day');
        }

        return $count;
    }

    /**
     * Get fiscal deadlines for a given month/year
     */
    public function getFiscalDeadlines(int $year, int $month, string $lang = 'ro'): array
    {
        $deadlines = [];
        $nameKey = "name_$lang";
        $descKey = "description_$lang";

        foreach ($this->fiscalDeadlines as $key => $deadline) {
            // Check if this deadline applies to this month
            if (isset($deadline['months']) && !in_array($month, $deadline['months'])) {
                continue;
            }

            $day = $deadline['day'];
            $dateStr = sprintf('%04d-%02d-%02d', $year, $month, $day);

            // Adjust to next business day if deadline falls on weekend/holiday
            if (!$this->isBusinessDay($dateStr)) {
                $dateStr = $this->getNextBusinessDay($dateStr);
            }

            $deadlines[] = [
                'key' => $key,
                'date' => $dateStr,
                'original_day' => $day,
                'name' => $deadline[$nameKey] ?? $deadline['name_ro'],
                'description' => $deadline[$descKey] ?? $deadline['description_ro'],
                'adjusted' => $dateStr !== sprintf('%04d-%02d-%02d', $year, $month, $day)
            ];
        }

        // Sort by date
        usort($deadlines, function ($a, $b) {
            return strcmp($a['date'], $b['date']);
        });

        return $deadlines;
    }

    /**
     * Get fiscal calendar for entire year
     */
    public function getYearlyFiscalCalendar(int $year, string $lang = 'ro'): array
    {
        $calendar = [];

        for ($month = 1; $month <= 12; $month++) {
            $monthName = $lang === 'en'
                ? date('F', mktime(0, 0, 0, $month, 1))
                : $this->getRomanianMonthName($month);

            $calendar[] = [
                'month' => $month,
                'month_name' => $monthName,
                'deadlines' => $this->getFiscalDeadlines($year, $month, $lang)
            ];
        }

        return $calendar;
    }

    /**
     * Get Romanian month name
     */
    private function getRomanianMonthName(int $month): string
    {
        $months = [
            1 => 'Ianuarie', 2 => 'Februarie', 3 => 'Martie',
            4 => 'Aprilie', 5 => 'Mai', 6 => 'Iunie',
            7 => 'Iulie', 8 => 'August', 9 => 'Septembrie',
            10 => 'Octombrie', 11 => 'Noiembrie', 12 => 'Decembrie'
        ];
        return $months[$month] ?? '';
    }

    /**
     * Get upcoming deadlines from today
     */
    public function getUpcomingDeadlines(int $days = 30, string $lang = 'ro'): array
    {
        $today = new DateTime();
        $endDate = new DateTime("+{$days} days");
        $deadlines = [];

        $currentMonth = (int)$today->format('m');
        $currentYear = (int)$today->format('Y');

        // Check current and next month
        for ($i = 0; $i < 2; $i++) {
            $month = $currentMonth + $i;
            $year = $currentYear;
            if ($month > 12) {
                $month -= 12;
                $year++;
            }

            $monthDeadlines = $this->getFiscalDeadlines($year, $month, $lang);
            foreach ($monthDeadlines as $deadline) {
                $deadlineDate = new DateTime($deadline['date']);
                if ($deadlineDate >= $today && $deadlineDate <= $endDate) {
                    $deadline['days_until'] = $today->diff($deadlineDate)->days;
                    $deadline['is_urgent'] = $deadline['days_until'] <= 5;
                    $deadlines[] = $deadline;
                }
            }
        }

        // Sort by date
        usort($deadlines, function ($a, $b) {
            return strcmp($a['date'], $b['date']);
        });

        return $deadlines;
    }

    /**
     * Get calendar month data with holidays and deadlines
     */
    public function getMonthCalendar(int $year, int $month, string $lang = 'ro'): array
    {
        $firstDay = new DateTime("$year-$month-01");
        $lastDay = new DateTime($firstDay->format('Y-m-t'));
        $holidays = $this->getHolidays($year, $lang);
        $deadlines = $this->getFiscalDeadlines($year, $month, $lang);

        // Create lookup arrays
        $holidayLookup = [];
        foreach ($holidays as $holiday) {
            $holidayLookup[$holiday['date']] = $holiday;
        }

        $deadlineLookup = [];
        foreach ($deadlines as $deadline) {
            if (!isset($deadlineLookup[$deadline['date']])) {
                $deadlineLookup[$deadline['date']] = [];
            }
            $deadlineLookup[$deadline['date']][] = $deadline;
        }

        // Build calendar days
        $days = [];
        $current = clone $firstDay;

        while ($current <= $lastDay) {
            $dateStr = $current->format('Y-m-d');
            $dayOfWeek = (int)$current->format('N');

            $days[] = [
                'date' => $dateStr,
                'day' => (int)$current->format('d'),
                'day_of_week' => $dayOfWeek,
                'is_weekend' => $dayOfWeek >= 6,
                'is_holiday' => isset($holidayLookup[$dateStr]),
                'holiday' => $holidayLookup[$dateStr] ?? null,
                'is_business_day' => $this->isBusinessDay($dateStr),
                'deadlines' => $deadlineLookup[$dateStr] ?? []
            ];

            $current->modify('+1 day');
        }

        return [
            'year' => $year,
            'month' => $month,
            'month_name' => $lang === 'en'
                ? date('F', mktime(0, 0, 0, $month, 1))
                : $this->getRomanianMonthName($month),
            'first_day_of_week' => (int)$firstDay->format('N'),
            'days_in_month' => (int)$lastDay->format('d'),
            'business_days' => $this->countBusinessDays($firstDay->format('Y-m-d'), $lastDay->format('Y-m-d')),
            'days' => $days
        ];
    }
}
