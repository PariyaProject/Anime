const fs = require('fs');
const cheerio = require('cheerio');

const scheduleData = {
    monday: [], tuesday: [], wednesday: [], thursday: [],
    friday: [], saturday: [], sunday: []
};

const homeHtml = fs.readFileSync('cycani_home.html', 'utf-8');
const $h = cheerio.load(homeHtml);

$h('a[href*="/bangumi/"], a[href*="/watch/"]').each((_, link) => {
    const $link = $h(link);
    const href = $link.attr('href');
    const title = $link.text().trim() || $link.attr('title') || '';
    if (!title || title.length < 2) return;

    const parentText = $link.closest('.public-list-box, .public-list-div, li, div').text().trim();
    const dayMatch = parentText.match(/(周一|周二|周三|周四|周五|周六|周日|星期一|星期二|星期三|星期四|星期五|星期六|星期日)/);
    if (dayMatch) {
        let animeId = null;
        if (href?.includes('/bangumi/')) {
            const match = href.match(/\/bangumi\/(\d+)\.html/);
            if (match) animeId = match[1];
        } else if (href?.includes('/watch/')) {
            const match = href.match(/\/watch\/(\d+)\/\d+\/\d+\.html/);
            if (match) animeId = match[1];
        }

        if (animeId) {
            let dayKey = 'monday';
            if (/周二|星期二/.test(dayMatch[1])) dayKey = 'tuesday';
            else if (/周三|星期三/.test(dayMatch[1])) dayKey = 'wednesday';
            else if (/周四|星期四/.test(dayMatch[1])) dayKey = 'thursday';
            else if (/周五|星期五/.test(dayMatch[1])) dayKey = 'friday';
            else if (/周六|星期六/.test(dayMatch[1])) dayKey = 'saturday';
            else if (/周日|星期日/.test(dayMatch[1])) dayKey = 'sunday';

            const timeMatch = parentText.match(/(\d+\|[^|\s]+)/);
            const isCompleted = parentText.includes('已完结') || parentText.includes('完结');

            if (!scheduleData[dayKey].find(a => a.id === animeId)) {
                scheduleData[dayKey].push({
                    id: animeId,
                    title: title,
                    cover: '',
                    status: isCompleted ? '已完结' : '连载中',
                    broadcastTime: timeMatch ? timeMatch[1] : '',
                    day: dayKey
                });
            }
        }
    }
});

let count = 0;
for (const day in scheduleData) {
    count += scheduleData[day].length;
}
console.log("Total scraped items:", count);
if (count > 0) {
    console.log("Monday:", scheduleData.monday.slice(0, 2));
}
