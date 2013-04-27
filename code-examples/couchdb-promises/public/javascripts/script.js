$(function() {

  $('button.btn-player').on('click', function() {
    var $that = $(this);
    var id = $that.attr('id');
    $.post("/match", { id: id }, function(data) {
      $($that.siblings('span')[0]).text('- ' + data.newScore);
    });
  })

});