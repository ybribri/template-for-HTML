function activateNav() {

    // common js for nav-bar    
    let href=window.location.href;
    let lastpart = href.split('#').pop();
    let temp='';
    $('.nav-link').removeClass('active');
    $.each($('.nav-link'), function(){
        temp=$(this).attr('href').substring(1);
        if (lastpart==temp) {
            $(this).addClass('active');
        }
    });

    $('.nav-link').click(function() {
        let nav_href=$(this).attr('href');
        nav_href=nav_href.substring(1);
        if (nav_href.length!=0) {
            eTemplate({ sync_url:`${nav_href}.html`});
        }
    });   

    $('.sum_item').click(function() {
        let itemId=$(this).attr('id');
        let href=window.location.href;
        let firstpart = href.split('#')[0];
        window.location.href=firstpart+'#feature';
        eTemplate({
            sync_url: `feature.html`,
            scrollto: {id:itemId, block:"center"}
        });
    });

    $('.hamburger').click(function() {
        $(this).toggleClass('active');
        if ($('.container-fluid').css('display')=='none') {
            $('.container-fluid').css('display','block');
        } else {
            $('.container-fluid').css('display','none');
        }
    });

    $(window).resize(function(){
        let windowsize=$(this).width();
        if (windowsize<670) {
            $('.container-fluid').css('display','none');
        } else {
            $('.container-fluid').css('display','block');
        }
    });

    window.onhashchange = function() {
        if (!window.innerDocClick) {
            let href=window.location.href;
            let lastpart = href.split('#').pop();
            if (href.includes('#')) {
                eTemplate({ sync_url:`${lastpart}.html` });
            } else {
                eTemplate({ sync_url:`index.html` });
            }
        }
    }

}