$('.star').on('click', (e) => {
    const rating = e.target.id;
    $('.star').removeClass('fa-solid')
    $('.star').addClass('fa-regular');
    for (let i = 0; i <= rating; i++) {
        $('#' + i).removeClass('fa-regular');
        $('#' + i).addClass('fa-solid');
    }
    $('#rating').val(e.target.id)
})

let ratingg = $("#rating").val();
for (let i = 0; i <= ratingg; i++) {
    $('#' + i).removeClass('fa-regular');
    $('#' + i).addClass('fa-solid');
}

// form đánh giá
$('#rating-form').validate({
    rules: {
        rating: {
            required: true
        },
        comment: {
            required: true
        }
    },
    submitHandler: async (form) => {
        if (rating.value !== '') {
            const formn = document.getElementById('rating-form');
            const formData = new FormData(formn);
            const payload = Object.fromEntries(formData);
            await fetch(`/reviews/add-review`, {
                method: 'POST',
                body: JSON.stringify(payload),
                headers: {
                    'Content-Type': 'application/json'
                }
            }).then(response => response.json())
                .then(data => {
                    if (data.success) {
                        Swal.fire({
                            icon: 'success',
                            title: 'Thành công',
                            text: 'Đánh giá của bạn đã được gửi',
                        }).then(() => {
                            location.assign('/reviews');
                        })
                    }
                })
                .catch(err => {
                    console.log(err);
                })

        } else {
            Swal.fire({
                icon: 'error',
                title: 'Ôi...',
                text: 'Vui lòng chọn số sao đánh giá',
            })
        }
    }
})

// form sửa đánh giá
$('#edit-rating-form').validate({
    rules: {
        rating: {
            required: true
        },
        comment: {
            required: true
        }
    },
    submitHandler: async (form) => {
        if (rating.value !== '') {
            const formn = document.getElementById('edit-rating-form');
            const formData = new FormData(formn);
            const payload = Object.fromEntries(formData);
            await fetch(`/reviews/edit_review`, {
                method: 'POST',
                body: JSON.stringify(payload),
                headers: {
                    'Content-Type': 'application/json'
                }
            }).then(response => response.json())
                .then(data => {
                    if (data.success) {
                        Swal.fire({
                            icon: 'success',
                            title: 'Thành công',
                            text: 'Đánh giá của bạn đã được cập nhật',
                        }).then(() => {
                            location.assign('/reviews');
                        })
                    }
                })
                .catch(err => {
                    console.log(err);
                })

        } else {
            Swal.fire({
                icon: 'error',
                title: 'Ôi...',
                text: 'Vui lòng chọn số sao đánh giá',
            })
        }
    }
})

// xóa đánh giá
// /reviews/delete-reivew/{{this._id}}
const deleteReview = async (id) => {
    Swal.fire({
        title: 'Bạn chắc chứ?',
        text: 'Bạn có chắc muốn xóa không?',
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#1d4391',
        cancelButtonColor: 'rgb(107, 119, 136)',
        confirmButtonText: 'Vâng, xóa!'
    }).then(async (result) => {
        if (result.isConfirmed) {
            await fetch(`/reviews/delete-reivew/${id}`)
                .then(response => response.json())
                .then(data => {
                    if (data.success) {
                        Swal.fire({
                            icon: 'success',
                            title: 'Thành công',
                            text: 'Đã xóa đánh giá của bạn',
                        }).then(() => {
                            location.assign('/reviews');
                        })
                    }
                })
        }
    })
}
